
import os
from unittest import result
import requests
import streamlit as st

API_URL = os.getenv("ROLEINTERVIEW_API_URL", "http://127.0.0.1:8000")

st.set_page_config(
    page_title="Role Interview | Skill Analysis",
    page_icon="🎯",
    layout="wide",
)

st.markdown(
    """
    <style>
    .block-container {padding-top: 2rem; padding-bottom: 3rem;}
    .main-title {font-size: 2.2rem; font-weight: 750;}
    .sub-title {color: #64748b; margin-bottom: 1.5rem;}
    </style>
    """,
    unsafe_allow_html=True,
)

st.markdown('<div class="main-title">Role Interview</div>', unsafe_allow_html=True)
st.markdown(
    '<div class="sub-title">Resume analysis · Role recommendations · Skill gap analysis</div>',
    unsafe_allow_html=True,
)

st.info(
    "Upload up to 2 resumes. Select a recommended role for each candidate "
    "to compare resume-supported skills with the role requirements."
)


def api_post(path, **kwargs):
    try:
        response = requests.post(
            f"{API_URL}{path}",
            timeout=240,
            **kwargs,
        )
        response.raise_for_status()
        return response.json()
    except requests.RequestException as exc:
        detail = ""
        if getattr(exc, "response", None) is not None:
            detail = exc.response.text[:1000]
        raise RuntimeError(
            f"API request failed: {exc}\n{detail}"
        ) from exc


def get_roles(data):
    """Accept common role-list response formats."""
    if isinstance(data, list):
        items = data
    elif isinstance(data, dict):
        items = None
        for key in ("roles", "recommended_roles", "role_recommendations"):
            if isinstance(data.get(key), list):
                items = data[key]
                break

        if items is None:
            items = []
    else:
        items = []

    result = []
    for item in items:
        if isinstance(item, str):
            result.append({"role": item, "details": {}})
        elif isinstance(item, dict):
            name = (
                item.get("role")
                or item.get("title")
                or item.get("role_name")
                or item.get("name")
            )
            if name:
                result.append({"role": str(name), "details": item})

    # Remove duplicate role names while preserving order.
    unique = {}
    for item in result:
        unique.setdefault(item["role"], item)

    return list(unique.values())


def display_skill_list(skills):
    if not skills:
        st.write("No skills listed.")
        return

    for skill in skills:
        st.markdown(f"- {skill}")


def skill_names(items):
    """Convert string or dictionary skill lists into displayable names."""
    names = []
    if not isinstance(items, list):
        return names

    for item in items:
        if isinstance(item, str):
            names.append(item)
        elif isinstance(item, dict):
            name = item.get("skill") or item.get("name") or item.get("title")
            if name:
                names.append(str(name))

    return list(dict.fromkeys(names))


def render_candidate(candidate, index):
    st.divider()

    st.subheader(f"Candidate {index + 1}: {candidate['filename']}")

    if candidate.get("error"):
        st.error(candidate["error"])
        return

    extracted_text = candidate.get("resume_text", "")
    if not extracted_text:
        st.warning("Resume text is not available.")
        return

    with st.expander("View extracted resume text"):
        st.text_area(
            "Extracted text",
            value=extracted_text,
            height=180,
            key=f"resume_text_{index}",
            disabled=True,
        )

    roles = candidate.get("roles", [])
    if not roles:
        st.warning(
            "No roles were returned by the role-discovery API. "
            "Check the API response before continuing."
        )
        with st.expander("Role discovery response"):
            st.json(candidate.get("role_response", {}))
        return

    role_names = [item["role"] for item in roles]

    selected_role = st.selectbox(
        "Select a recommended role",
        options=role_names,
        key=f"selected_role_{index}",
    )
    
    if candidate.get("comparison_role") != selected_role:
        candidate.pop("comparison", None)
        candidate.pop("comparison_error", None)

    selected = next(
        item for item in roles if item["role"] == selected_role
    )

    if selected["details"]:
        details = selected["details"]
        explanation = (
            details.get("reason")
            or details.get("match_reason")
            or details.get("description")
            or details.get("reasoning")
        )
        if explanation:
            st.caption(str(explanation))

        supporting = (
            details.get("supporting_skills")
            or details.get("matching_skills")
            or details.get("resume_skills")
        )
        if supporting:
            st.write("**Role recommendation evidence**")
            display_skill_list(skill_names(supporting))

    if st.button(
        "Compare Skills",
        key=f"compare_{index}",
        type="primary",
        use_container_width=True,
    ):
        with st.spinner(f"Comparing skills for {selected_role}..."):
            try:
                result = api_post(
                    "/roles/requirements",
                    json={
                        "role": selected_role,
                        "resume_text": extracted_text,
                    },
                )
                candidate["comparison"] = result
                candidate["comparison_role"] = selected_role
                candidate.pop("comparison_error", None)
            except RuntimeError as exc:
                candidate["comparison_error"] = str(exc)

    if candidate.get("comparison_error"):
        st.error(candidate["comparison_error"])

    
    result = candidate.get("comparison")
    if not result or candidate.get("comparison_role") != selected_role:
        return

    # API response may wrap the actual data inside "requirements".
    requirements = result.get("requirements", result)

    required = skill_names(requirements.get("role_required_skills", []))
    matched = skill_names(requirements.get("common_skills", []))
    missing = skill_names(requirements.get("missing_role_skills", []))
    areas = requirements.get("skill_areas", [])

    # Use evidence-verified skill areas to validate the displayed groups.
    if isinstance(areas, list) and areas:
        supported_from_areas = [
            area.get("skill")
            for area in areas
            if isinstance(area, dict)
            and area.get("resume_supported") is True
            and area.get("skill")
        ]
        unsupported_from_areas = [
            area.get("skill")
            for area in areas
            if isinstance(area, dict)
            and area.get("resume_supported") is False
            and area.get("skill")
        ]

        if supported_from_areas:
            matched = list(dict.fromkeys(supported_from_areas))
        if unsupported_from_areas:
            missing = list(dict.fromkeys(unsupported_from_areas))

    st.markdown(f"### Skill comparison: {selected_role}")

    metric1, metric2, metric3 = st.columns(3)
    metric1.metric("Required skills", len(required))
    metric2.metric("Resume matched", len(matched))
    metric3.metric("Missing from resume", len(missing))

    matched_col, missing_col = st.columns(2)

    with matched_col:
        st.markdown("#### ✅ Matching skills")
        st.caption("Evidence for these skills was found in the resume.")
        if matched:
            for skill in matched:
                st.markdown(f"- 🟢 {skill}")
        else:
            st.write("No matching skills found.")

    with missing_col:
        st.markdown("#### 📚 Missing required skills")
        st.caption(
            "These role requirements were not supported by resume evidence. "
            "This does not prove the candidate lacks the skill."
        )
        if missing:
            for skill in missing:
                st.markdown(f"- 🟠 {skill}")
        else:
            st.success("No missing required skills detected.")

    if areas:
        st.markdown("#### Skill evidence and concepts")
        for area in areas:
            if not isinstance(area, dict):
                continue

            skill = area.get("skill", "Skill")
            supported = area.get("resume_supported")
            label = "Resume-supported" if supported else "Not found in resume"

            with st.expander(f"{skill} — {label}"):
                evidence = area.get("resume_evidence", [])
                if isinstance(evidence, str):
                    evidence = [evidence]

                if evidence:
                    st.write("**Resume evidence**")
                    display_skill_list(evidence)
                else:
                    st.caption("No resume evidence returned.")

                concepts = area.get("concepts", [])
                if concepts:
                    st.write("**Concepts for interview assessment**")
                    for concept in concepts:
                        if isinstance(concept, str):
                            st.markdown(f"- {concept}")
                        elif isinstance(concept, dict):
                            name = concept.get("name", "Concept")
                            st.markdown(f"- **{name}**")

    with st.expander("View complete comparison response"):
        st.json(requirements)


uploaded_files = st.file_uploader(
    "Upload candidate resumes (PDF or DOCX)",
    type=["pdf", "docx"],
    accept_multiple_files=True,
    max_upload_size=5,
    help="For the demo, upload one or two resumes.",
)

if uploaded_files and len(uploaded_files) > 2:
    st.warning("Please upload no more than 2 resumes.")

if st.button(
    "Analyze Resumes & Recommend Roles",
    type="primary",
    disabled=not uploaded_files or len(uploaded_files) > 2,
    use_container_width=True,
):
    st.session_state["candidates"] = []

    progress = st.progress(0)
    status = st.empty()
    total = len(uploaded_files)

    for index, uploaded_file in enumerate(uploaded_files):
        candidate = {
            "filename": uploaded_file.name,
            "resume_text": "",
            "roles": [],
        }

        status.write(f"Analyzing {uploaded_file.name}...")

        try:
            uploaded_file.seek(0)
            analysis = api_post(
                "/resume/analyze",
                files={
                    "file": (
                        uploaded_file.name,
                        uploaded_file.getvalue(),
                        uploaded_file.type or "application/octet-stream",
                    )
                },
            )

            resume_text = (
                analysis.get("extracted_text")
                or analysis.get("resume_text")
                or analysis.get("text")
                or ""
            )

            if not resume_text.strip():
                raise RuntimeError(
                    "Resume analysis response did not contain extracted text. "
                    f"Response keys: {list(analysis.keys())}"
                )

            candidate["resume_text"] = resume_text

            status.write(f"Finding suitable roles for {uploaded_file.name}...")

            role_response = api_post(
                "/roles/discover",
                json={"resume_text": resume_text},
            )

            candidate["role_response"] = role_response
            candidate["roles"] = get_roles(role_response)

        except (RuntimeError, ValueError, AttributeError) as exc:
            candidate["error"] = str(exc)

        st.session_state["candidates"].append(candidate)
        progress.progress((index + 1) / total)

    status.success("Resume processing finished.")

candidates = st.session_state.get("candidates", [])

if candidates:
    st.markdown("## Candidate results")
    st.caption(
        "Each candidate has independent resume text, recommendations, "
        "role selection, and skill comparison."
    )

    for index, candidate in enumerate(candidates):
        render_candidate(candidate, index)

st.divider()
st.caption(f"Backend API: {API_URL}")

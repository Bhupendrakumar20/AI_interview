import os
import json
import logging

from ctransformers import AutoModelForCausalLM
from huggingface_hub import hf_hub_download


# ==========================================================
# CACHE
# ==========================================================

CACHE_DIR = r"D:\AI_model_cache"

os.makedirs(CACHE_DIR, exist_ok=True)

os.environ["HF_HOME"] = CACHE_DIR
os.environ["HUGGINGFACE_HUB_CACHE"] = CACHE_DIR
os.environ["TRANSFORMERS_CACHE"] = CACHE_DIR


# ==========================================================
# LOGGING
# ==========================================================

logging.basicConfig(

    filename="pipeline.log",

    level=logging.INFO,

    format="%(asctime)s - %(levelname)s - %(message)s"

)

logger = logging.getLogger(__name__)


def log(msg, level="info"):

    print(msg)

    getattr(logger, level)(msg)


# ==========================================================
# LOAD MODEL
# ==========================================================

def load_mistral_pipeline():

    log("[Device] CPU")

    log("[Model] Checking GGUF model...")


    model_path = hf_hub_download(

        repo_id="TheBloke/Mistral-7B-Instruct-v0.2-GGUF",

        filename="mistral-7b-instruct-v0.2.Q4_K_M.gguf",

        local_dir=CACHE_DIR

    )


    log(f"[Model Path] {model_path}")


    llm = AutoModelForCausalLM.from_pretrained(

        model_path,

        model_type="mistral",

        context_length=4096,

        max_new_tokens=1024,

        temperature=0.3,

        repetition_penalty=1.1,

        threads=os.cpu_count(),

        local_files_only=True

    )


    log(

        f"[Mistral Ready] Threads={os.cpu_count()}"

    )

    return llm



model = load_mistral_pipeline()


print("Model Loaded")


# ==========================================================
# GENERATE
# ==========================================================

def generate(prompt):

    final_prompt = f"""

You are an ATS Resume Parser.

Return ONLY JSON.

Never explain.

Never hallucinate.



{prompt}



JSON:

"""


    response = model(

        final_prompt,

        max_new_tokens=1024,

        temperature=0,

        repetition_penalty=1.1

    )


    return response.strip()


# ==========================================================
# EXPERIENCE
# ==========================================================

def correct_experience(

        raw_text,

        partial_json

):

    prompt = f"""

Fix the WORK EXPERIENCE section.


Return JSON:


{{

"workExperiences":[

{{

"company":"",

"jobTitle":"",

"date":"",

"location":"",

"descriptions":[]

}}

]

}}


RULES:

1 Merge broken bullet points.

2 Correct company names.

3 Correct dates.

4 Correct location.

5 Preserve information.

6 Do not hallucinate.



RAW EXPERIENCE:


{raw_text}



PARTIAL JSON:


{json.dumps(partial_json,indent=2)}

"""

    return generate(prompt)


# ==========================================================
# PROJECTS
# ==========================================================

def correct_projects(

        raw_text,

        partial_json

):

    prompt = f"""

Fix the PROJECTS section.


Return JSON:


{{

"projects":[

{{

"title":"",

"date":"",

"technologies":[],

"github":"",

"liveDemo":"",

"descriptions":[]

}}

]

}}



RULES:


1 Merge wrapped lines.

2 Extract technologies.

3 Extract github url.

4 Extract live demo url.

5 Preserve information.

6 Do not hallucinate.



RAW PROJECTS:


{raw_text}



PARTIAL JSON:


{json.dumps(partial_json,indent=2)}

"""

    return generate(prompt)


# ==========================================================
# MULTILINE INPUT
# ==========================================================

def get_multiline_input(title):

    print("\n" + "="*50)

    print(title)

    print("Type END on new line")

    print("="*50)


    lines = []


    while True:

        line = input()


        if line.strip() == "END":

            break


        lines.append(line)


    return "\n".join(lines)


# ==========================================================
# MAIN
# ==========================================================

if __name__ == "__main__":


    json_path = input(

        "Enter parsed_resume.json path: "

    )


    with open(

            json_path,

            "r",

            encoding="utf8"

    ) as f:

        parsed_resume = json.load(f)


    raw_experience = get_multiline_input(

        "Paste RAW EXPERIENCE"

    )


    raw_projects = get_multiline_input(

        "Paste RAW PROJECTS"

    )


    result = parsed_resume.copy()


    # ---------------------------------

    print("\nCorrecting Experience...\n")


    exp = correct_experience(

        raw_experience,

        parsed_resume.get(

            "workExperiences",

            []

        )

    )


    print(exp)


    try:

        exp_json = json.loads(exp)

        result["workExperiences"] = exp_json["workExperiences"]


    except Exception as e:

        print(

            "Experience JSON parse failed"

        )

        print(e)


    # ---------------------------------

    print("\nCorrecting Projects...\n")


    proj = correct_projects(

        raw_projects,

        parsed_resume.get(

            "projects",

            []

        )

    )


    print(proj)


    try:

        proj_json = json.loads(proj)

        result["projects"] = proj_json["projects"]


    except Exception as e:

        print(

            "Projects JSON parse failed"

        )

        print(e)


    # ---------------------------------

    with open(

            "final_resume.json",

            "w",

            encoding="utf8"

    ) as f:

        json.dump(

            result,

            f,

            indent=4,

            ensure_ascii=False

        )


    print("\nSaved to final_resume.json")
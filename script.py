import re
import json
from pdfminer.high_level import extract_text

# 1. Extraer texto del PDF
text = extract_text("tema1r_es.pdf")

# 2. Regex para capturar preguntas
pattern = re.compile(
    r"\d+\.\s+(.*?)\n\s*A\)\.-?(.*?)\n\s*B\)\.-?(.*?)\n\s*C\)\.-?(.*?)(?=\n\s*\d+\.|\Z)",
    re.DOTALL
)

questions = []

for match in pattern.finditer(text):
    q = match.group(1).strip()
    options = [
        match.group(2).strip(),
        match.group(3).strip(),
        match.group(4).strip()
    ]
    questions.append({
        "q": q,
        "options": options,
        "answer": None
    })

# 3. Guardar JSON
with open("preguntas.json", "w", encoding="utf-8") as f:
    json.dump({"tema-1": questions}, f, indent=2, ensure_ascii=False)

print("JSON generado correctamente.")
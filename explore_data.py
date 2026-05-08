import pandas as pd
import json
import sys
import os

try:
    matriz_path = "Archivos Claude/2/docs-construccion/Matríz de ejercicios.xlsx"
    build_path = "Archivos Claude/2/docs-construccion/(HACER COPIAAA) Build - Planilla.xlsx"
    
    print(f"File exists (Matriz): {os.path.exists(matriz_path)}")
    print(f"File exists (Build): {os.path.exists(build_path)}")

    if os.path.exists(matriz_path):
        xls_matriz = pd.ExcelFile(matriz_path)
        print("Matriz sheets:", xls_matriz.sheet_names)
        for sheet in xls_matriz.sheet_names:
            df = pd.read_excel(matriz_path, sheet_name=sheet, nrows=5)
            print(f"  {sheet} columns:", df.columns.tolist())

    if os.path.exists(build_path):
        xls_build = pd.ExcelFile(build_path)
        print("Build sheets:", xls_build.sheet_names)
        for sheet in xls_build.sheet_names:
            df = pd.read_excel(build_path, sheet_name=sheet, nrows=5)
            print(f"  {sheet} columns:", df.columns.tolist())
            
except Exception as e:
    print("Error:", e)

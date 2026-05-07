import pandas as pd
import numpy as np
import warnings
import uuid

# Ignore openpyxl warnings about data validation extensions
warnings.filterwarnings('ignore', category=UserWarning, module='openpyxl')

MATRIZ_PATH = "Archivos Claude/2/docs-construccion/Matríz de ejercicios.xlsx"
BUILD_PATH = "Archivos Claude/2/docs-construccion/(HACER COPIAAA) Build - Planilla.xlsx"
OUTPUT_PATH = "exercises_unificados.csv"

def clean_col(name):
    if pd.isna(name): return name
    return str(name).strip().lower()

def extract_matriz():
    # Mapping of sheet names to target category
    sheet_mapping = {
        'Lower Body': 'lower_body',
        'Upper Body': 'upper_body',
        'Trunk & Core': 'trunk_core',
        'Jump': 'jump',
        'Speed': 'speed',
        'Mobility & Stretch': 'mobility_stretch',
        'Conditioning': 'conditioning',
        'Testing': 'testing'
    }
    
    xls = pd.ExcelFile(MATRIZ_PATH)
    all_data = []
    
    for sheet_name in xls.sheet_names:
        clean_sheet_name = sheet_name.strip()
        if clean_sheet_name not in sheet_mapping:
            continue
            
        category = sheet_mapping[clean_sheet_name]
        df = pd.read_excel(xls, sheet_name=sheet_name)
        
        # Clean column names
        df.columns = [str(c).strip().lower() for c in df.columns]
        
        # Identify columns
        # We need name, link, equipment, pattern, contraction, type
        # In matriz, columns usually are: 'name', 'link', 'type', 'equipment', 'pattern', 'contraction', etc.
        
        # Create normalized dict
        for _, row in df.iterrows():
            name = None
            link = None
            eq = None
            pat = None
            cont = None
            ex_type = None
            
            if 'name' in row: name = row['name']
            elif 'exercise' in row: name = row['exercise']
            elif 'ejercicio' in row: name = row['ejercicio']
                
            if pd.isna(name) or str(name).strip() == '': continue
            
            if 'link' in row: link = row['link']
            elif 'video' in row: link = row['video']
            elif 'youtube' in row: link = row['youtube']
                
            if 'equipment' in row: eq = row['equipment']
            if 'pattern' in row: pat = row['pattern']
            if 'contraction' in row: cont = row['contraction']
            if 'type' in row: ex_type = row['type']
            
            all_data.append({
                'name': str(name).strip(),
                'youtube_url': str(link).strip() if not pd.isna(link) else None,
                'category': category,
                'equipment': str(eq).strip() if not pd.isna(eq) else None,
                'pattern': str(pat).strip() if not pd.isna(pat) else None,
                'contraction_type': str(cont).strip() if not pd.isna(cont) else None,
                'exercise_type': str(ex_type).strip() if not pd.isna(ex_type) else None,
                'source': 'matriz'
            })
            
    return pd.DataFrame(all_data)

def extract_build():
    xls = pd.ExcelFile(BUILD_PATH)
    sheet_name = None
    for s in xls.sheet_names:
        if 'EJERCICIOS' in s.upper():
            sheet_name = s
            break
            
    if not sheet_name:
        print("Sheet EJERCICIOS not found in Build planilla")
        return pd.DataFrame()
        
    df = pd.read_excel(xls, sheet_name=sheet_name, header=None)
    df.columns = ['name', 'link'] + [f'col_{i}' for i in range(2, len(df.columns))]
    
    all_data = []
    for _, row in df.iterrows():
        name = row['name']
        link = row['link']
            
        if pd.isna(name) or str(name).strip() == '': continue
            
        if 'link' in row: link = row['link']
        elif 'video' in row: link = row['video']
            
        all_data.append({
            'name': str(name).strip(),
            'youtube_url': str(link).strip() if not pd.isna(link) else None,
            'category': 'adjuntos',
            'equipment': None,
            'pattern': None,
            'contraction_type': None,
            'exercise_type': None,
            'source': 'build'
        })
        
    return pd.DataFrame(all_data)

if __name__ == "__main__":
    print("Extracting from Matriz...")
    df_matriz = extract_matriz()
    print(f"Extracted {len(df_matriz)} from Matriz")
    
    print("Extracting from Build...")
    df_build = extract_build()
    print(f"Extracted {len(df_build)} from Build")
    
    df_all = pd.concat([df_matriz, df_build], ignore_index=True)
    
    # Deduplicate by name (case insensitive)
    df_all['name_lower'] = df_all['name'].str.lower().str.replace(' ', '')
    
    initial_count = len(df_all)
    df_unique = df_all.drop_duplicates(subset=['name_lower'], keep='first').copy()
    final_count = len(df_unique)
    
    print(f"Removed {initial_count - final_count} duplicates.")
    
    # Drop temp col
    df_unique = df_unique.drop(columns=['name_lower', 'source'])
    
    # Generate UUIDs
    df_unique['id'] = [str(uuid.uuid4()) for _ in range(len(df_unique))]
    
    # Reorder
    cols = ['id', 'name', 'youtube_url', 'category', 'equipment', 'pattern', 'contraction_type', 'exercise_type']
    df_unique = df_unique[cols]
    
    df_unique.to_csv(OUTPUT_PATH, index=False)
    print(f"Saved {final_count} exercises to {OUTPUT_PATH}")

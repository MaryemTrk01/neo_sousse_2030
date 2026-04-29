from connect import get_data

if __name__ == "__main__":
    print("=== Test connexion base ===")
    result = get_data("SELECT COUNT(*) FROM capteurs;")
    if result:
        print("✅ Nombre de capteurs :", result[0][0])
    else:
        print("❌ Impossible de récupérer les données")

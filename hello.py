import requests

url = "https://us-central1-lab-ada-mapas.cloudfunctions.net/maps-query"

lugar = input("Ingresa un lugar a buscar: ")

resp = requests.get(url, params={"place": lugar})
data = resp.json()

for place in data.get("places", []):
    print(f"\nNombre: {place['displayName']['text']}")
    print(f"Dirección: {place['formattedAddress']}")
    print(f"Latitud: {place['location']['latitude']}")
    print(f"Longitud: {place['location']['longitude']}")
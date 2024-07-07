// klasa w której jest cała logika programu
import Marker from "./marker.js";
import { updateCoordinatesTable } from "../index.js";

export default class MapManager {
  constructor() {
    this.map = null;
    this.markers = [];
    this.connections = [];
    this.baseName = "UAV BASE";
    this.pointNameCounter = 0;
    this.maxRange = 7.5;
    this.dragStartPosition = null;
  }
  //Metoda do generowania mapy
  initMap() {
    this.map = L.map("map").setView([50.035, 22.001], 10); // Ustawiamy początkowe współrzędne i powiększenie
    // Dodajemy kafelki z OpenStreetMap
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(
      this.map
    );
    this.map.on("click", (e) => this.handleMapClick(e));
  }

  //Metoda do obsługi kliknięcia na mapie

  handleMapClick(e) {
    let id = this.markers[this.markers.length - 1]?.id + 1;
    if (isNaN(id)) {
      id = 0;
    }

    const lat = e.latlng.lat;
    const lng = e.latlng.lng;
    if (this.markers.length > 0) {
      const baseMarker = this.markers[0];
      const distanceFromBase = this.haversine(
        baseMarker.lat,
        baseMarker.lng,
        lat,
        lng
      );
      for (let i = 0; i < this.markers.length; i++) {
        const marker = this.markers[i];
      }

      if (distanceFromBase > this.maxRange) {
        alert(
          "Odległość od punktu bazowego przekracza maksymalny zasięg drona (7.5 km w jedną stronę)."
        );
        return;
      }
    }

    const name = this.generatePointName();
    let availableColors = [
      "gold",
      "red",
      "green",
      "orange",
      "yellow",
      "violet",
      "grey",
      "black",
    ];
    let randomColorIndex = Math.floor(Math.random() * availableColors.length);
    const color = id > 0 ? availableColors[randomColorIndex] : "blue";

    var greenIcon = new L.Icon({
      iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
      shadowUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    });

    const marker = L.marker([lat, lng], {
      icon: greenIcon,
      draggable: true,
    }).addTo(this.map);

    marker.bindPopup(name).openPopup();
    marker.on("click", () => this.handleMarkerClick(marker));

    marker.on("dragstart", (event) => {
      // Zapisujemy pozycję początkową markera
      const startPosition = event.target.getLatLng();
      this.dragStartPosition = {
        lat: startPosition.lat,
        lng: startPosition.lng,
      };

      console.log("Początkowa pozycja markera:", this.dragStartPosition);
    });

    marker.on("dragend", (event) => {
      const newLatLng = event.target.getLatLng();
      this.updateMarkerPosition(id, newLatLng.lat, newLatLng.lng);
    });
    const newMarker = new Marker(id, name, lat, lng, marker, color);
    this.markers.push(newMarker);

    updateCoordinatesTable(this.markers);
  }

    // Method to update marker position after dragging
    updateMarkerPosition(id, lat, lng) {
      const marker = this.markers.find((marker) => marker.id === id);
    
      if (!marker) {
        console.error(`Marker with ID ${id} does not exist.`);
        return;
      }
    
      if (marker.name === this.baseName) {
        // If the marker is the UAV base, ensure it stays within the maximum range from any other marker
        let withinRange = true;
        for (let i = 1; i < this.markers.length; i++) {
          const distanceFromBase = this.haversine(lat, lng, this.markers[i].lat, this.markers[i].lng);
          if (distanceFromBase > this.maxRange) {
            withinRange = false;
            break;
          }
        }
    
        if (!withinRange) {
          alert("The UAV base cannot be moved outside the maximum range of 7.5 km from any other marker.");
          marker.marker.setLatLng(this.dragStartPosition); // Revert to the original position
        } else {
          marker.lat = lat;
          marker.lng = lng;
          marker.marker.setLatLng([lat, lng]);
        }
      } else {
        // For other markers, ensure they stay within the maximum range from the UAV base
        const baseMarker = this.markers[0];
        const distanceFromBase = this.haversine(baseMarker.lat, baseMarker.lng, lat, lng);
        if (distanceFromBase > this.maxRange) {
          alert("The marker cannot be moved outside the maximum range of 7.5 km from the UAV base.");
          marker.marker.setLatLng(this.dragStartPosition); // Revert to the original position
        } else {
          marker.lat = lat;
          marker.lng = lng;
          marker.marker.setLatLng([lat, lng]);
        }
      }
    
      updateCoordinatesTable(this.markers);
      this.updateConnections(); // Update connections after marker position change
      this.generateAdjacencyGraph();
    }
    

  handleMarkerClick(marker) {
    marker.options.icon.options.html = `<div style="background-color: ${
      marker?.color ? marker.color : "blue"
    };" class="marker-pin"></div>`;
    marker.setIcon(marker.options.icon);
  }

  generatePointName() {
    if (this.markers.length === 0) {
      return this.baseName; // Jeśli brak punktów, zwracamy nazwę "UAV BASE"
    } else {
      if (this.markers.length === 1 && this.markers[0].name === this.baseName) {
        return "A"; // Jeśli pierwszy punkt po bazie UAV, zwracamy 'A'
      } else {
        const lastChar =
          this.markers[this.markers.length - 1].name.charCodeAt(0);
        if (lastChar >= 90) {
          return "A"; // Jeśli ostatni punkt ma nazwę 'Z', zwracamy 'A'
        } else {
          const nextChar = String.fromCharCode(lastChar + 1);
          return nextChar;
        }
      }
    }
  }
  /**Metoda do czyszczenia znaczników z mapy
   * Metoda usuwa wszytskie znaczniki z mapy, czyści tablicę znaczników.
   * Nastepnie aktualizauje tablicę współrzędnych,
   * czyści macierz sąsiedztwa i resetuje licznik punktów
   */
  clearMarkers() {
    this.markers.forEach((marker) => this.map.removeLayer(marker.marker));
    this.markers = [];
    updateCoordinatesTable(this.markers);
    this.clearConnections();
    this.clearAdjacencyMatrix(); // Dodana linia czyszcząca tablicę sąsiedztwa
  }

  clearAdjacencyMatrix() {
    const table = document.getElementById("adjacencyMatrixTable");
    table.innerHTML = "";
  }

  //Metoda do generowania grafu i obliczania odległości
// Method to generate adjacency matrix
generateAdjacencyGraph() {
  const adjacency_matrix = [];
  if (this.markers.length < 2) {
    console.error(
      "Minimum two points (base UAV and at least one airport) must be selected."
    );
    return;
  }

  const actions_matrix = [];

  for (let i = 0; i < this.markers.length; i++) {
    const row = [];
    for (let j = 0; j < this.markers.length; j++) {
      row.push(
        this.haversine(
          this.markers[i].lat,
          this.markers[i].lng,
          this.markers[j].lat,
          this.markers[j].lng
        )
      );
    }
    adjacency_matrix.push(row);
    actions_matrix.push(row);
  }

  this.updateAdjacencyMatrixTable(adjacency_matrix, this.markers);
  console.log("Adjacency Matrix:", adjacency_matrix);

  this.updateActionsMatrixTable(actions_matrix, this.markers);
  this.drawConnections(this.markers);
}
  // Metoda do obliczania odległości między dwoma punktami na sferze ziemskiej za pomocą formuły haversine
  haversine(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon1 - lon2) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return distance;
  }

  //Metoda do usuwania wybranego znacznika
  removeMarker(index) {
    const removedMarker = this.markers.splice(index, 1)[0]; // Usuwamy znacznik i go pobieramy
    console.log("removedMarker: ", removedMarker);
    if (!removedMarker) return;
    const deletedName = removedMarker.name;
    this.map.removeLayer(removedMarker.marker);
    // Aktualizujemy nazwę punktu w bindPopup
    removedMarker.marker.bindPopup(removedMarker.name).openPopup();
    if (deletedName === this.baseName && this.markers.length > 0) {
      // Jeśli usunięto punkt bazowy UAV i istnieją jeszcze inne punkty
      if (this.markers[0].name !== this.baseName) {
        this.markers[0].name = this.baseName;
      }
      this.updatePointNames(); // Aktualizuj nazwy punktów
    } else {
      this.updatePointNames(); // Jeśli usunięto inny punkt, aktualizuj nazwy punktów
    }

    updateCoordinatesTable(this.markers);
    this.updateConnections();
    this.generateAdjacencyGraph(); // Ponownie generujemy graf po usunięciu punktu
  }

  //metoda do aktualizowania nazw punktów
  updatePointNames() {
    let index = 0;

    if (!this.markers.length) return;

    if (this.markers[0].name === this.baseName) {
      index = 1;
    }

    for (let i = index; i < this.markers.length; i++) {
      this.markers[i].name = String.fromCharCode(65 + (i - index));
      console.log("index:", i, " marker: ", this.markers[i].name);
      // Aktualizujemy nazwę nowego punktu UAV base
      this.markers[0].marker.bindPopup(this.baseName).openPopup();
      // Aktualizujemy nazwę reszty punktów w bindPopup
      this.markers[i].marker.bindPopup(this.markers[i].name).openPopup();
    }
    //Nadajemy jeden kolor(niebieski) dla UAV base
    const blueIcon = new L.Icon({
      iconUrl:
        "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
      shadowUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    });

    this.markers[0].marker.setIcon(blueIcon);
  }

  // Method to update connections and adjacency matrix table
  updateConnections() {
    // Clear existing connections
    this.connections.forEach((connection) => this.map.removeLayer(connection));
    this.connections = [];

    // Re-draw connections with updated marker positions
    this.drawConnections(this.markers);
    this.generateAdjacencyGraph();
  }

  //Metoda do rysowania linii łączących punkty na mapie
  drawConnections(nodes) {
    this.clearConnections();
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const latlngs = [
          [nodes[i].lat, nodes[i].lng],
          [nodes[j].lat, nodes[j].lng],
        ];
        const polyline = L.polyline(latlngs, { color: "blue" }).addTo(this.map);
        this.connections.push(polyline);
      }
    }
  }

// Method to update adjacency matrix table
updateAdjacencyMatrixTable(matrix, markers) {
  const table = document.getElementById("adjacencyMatrixTable");
  table.innerHTML = "";
  const headerRow = document.createElement("tr");
  const emptyHeader = document.createElement("th");
  headerRow.appendChild(emptyHeader);

  for (let i = 0; i < markers.length; i++) {
    const headerCell = document.createElement("th");
    headerCell.innerText = markers[i].name;
    headerRow.appendChild(headerCell);
  }

  table.appendChild(headerRow);

  for (let i = 0; i < matrix.length; i++) {
    const row = document.createElement("tr");
    const rowHeader = document.createElement("th");
    rowHeader.innerText = markers[i].name;
    row.appendChild(rowHeader);

    for (let j = 0; j < matrix[i].length; j++) {
      const cell = document.createElement("td");
      cell.innerText = matrix[i][j].toFixed(2);
      row.appendChild(cell);
    }

    table.appendChild(row);
  }
}

// Method to update actions matrix table
updateActionsMatrixTable(matrix, markers) {
  const table = document.getElementById("actionsMatrixTable");
  table.innerHTML = "";
  const headerRow = document.createElement("tr");
  const emptyHeader = document.createElement("th");
  headerRow.appendChild(emptyHeader);

  for (let i = 0; i < markers.length; i++) {
    const headerCell = document.createElement("th");
    headerCell.innerText = markers[i].name;
    headerRow.appendChild(headerCell);
  }

  table.appendChild(headerRow);

  for (let i = 0; i < matrix.length; i++) {
    const row = document.createElement("tr");
    const rowHeader = document.createElement("th");
    rowHeader.innerText = markers[i].name;
    row.appendChild(rowHeader);

    for (let j = 0; j < matrix[i].length; j++) {
      const cell = document.createElement("td");
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.value = matrix[i][j].toFixed(2);

      if (checkbox.value === "0.00") {
        checkbox.disabled = true;
      } else {
        checkbox.checked = true;
      }

      checkbox.addEventListener("click", (event) => {
        const checkbox = event.target;
        const latlngs = [
          [markers[i].lat, markers[i].lng],
          [markers[j].lat, markers[j].lng],
        ];

        if (checkbox.checked) {
          const polyline = L.polyline(latlngs, { color: "green" }).addTo(this.map);
          this.connections.push(polyline);
        } else {
          const foundConnection = this.connections.find((el) => {
            return (
              (el._latlngs[0].lat === latlngs[0][0] && el._latlngs[0].lng === latlngs[0][1] && el._latlngs[1].lat === latlngs[1][0] && el._latlngs[1].lng === latlngs[1][1]) ||
              (el._latlngs[0].lat === latlngs[1][0] && el._latlngs[0].lng === latlngs[1][1] && el._latlngs[1].lat === latlngs[0][0] && el._latlngs[1].lng === latlngs[0][1])
            );
          });
          if (foundConnection) {
            this.map.removeLayer(foundConnection);
            this.connections = this.connections.filter((el) => el !== foundConnection);
          }
        }
      });

      cell.appendChild(checkbox);
      row.appendChild(cell);
    }

    table.appendChild(row);
  }
}

  // Metoda do usunięcia wszystkich linii (połączeń) z mapy oraz wyczyszczenie tablicy przechowującej te połączenia
  clearConnections() {
    this.connections.forEach((connection) => this.map.removeLayer(connection));
    this.connections = [];
  }

  // Metoda do zapisywania grafu
  saveGraph() {
    const nodes = this.markers;
    const adjacency_matrix = [];
    const actions_matrix = [];

    // Tworzymy dane w formacie CSV
    let csvContent = "Point Name,Latitude,Longitude,Color\n";

    nodes.forEach((node) => {
      csvContent += `${node.id},${node.name},${node.lat},${node.lng},${node.color}\n`;
    });

    csvContent += "Adjacency Matrix\n";

    // Tworzymy macierz sąsiedztwa
    for (let i = 0; i < nodes.length; i++) {
      const row = [];
      for (let j = 0; j < nodes.length; j++) {
        row.push(
          this.haversine(nodes[i].lat, nodes[i].lng, nodes[j].lat, nodes[j].lng)
        );
      }
      adjacency_matrix.push(row);
      actions_matrix.push(row);
    }

    adjacency_matrix.forEach((row) => {
      csvContent += row.join(",") + "\n";
    });

    actions_matrix.forEach((row) => {
      csvContent += row.join(",") + "\n";
    });

    // Tworzymy Blob z danymi CSV
    const blob = new Blob([csvContent], { type: "text/csv" });
    // Tworzymy link do pobrania pliku CSV
    const link = document.createElement("a");
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute("download", "dataGraph.csv");
    // Dodajemy link do dokumentu
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Metoda do wczytywania danych z pliku csv
  loadGraph(event) {
    const input = event.target;
    const file = input.files[0];
    const reader = new FileReader();

    reader.onload = () => {
      const text = reader.result;
      console.log("Loaded data:", text);

      const lines = text.split("\n");
      const nodes = [];
      const adjacencyMatrix = [];

      let isAdjacencyMatrix = false;

      lines.forEach((line) => {
        if (!line.trim()) return;
        if (line.trim() === "Adjacency Matrix") {
          isAdjacencyMatrix = true;
          return;
        }

        if (!isAdjacencyMatrix) {
          const [id, name, lat, lng, color] = line.split(","); // Dodanie koloru
          if (name !== "Point Name") {
            nodes.push({
              id: id,
              name: name,
              lat: parseFloat(lat),
              lng: parseFloat(lng),
              color: color, // Dodanie koloru
            });
          }
        } else {
          const row = line.split(",").map(Number);
          adjacencyMatrix.push(row);
        }
      });

      console.log("Parsed nodes:", nodes);

      this.clearMarkers();

      nodes.forEach((node) => {
        this.addMarker(node.id, node.lat, node.lng, node.name, node.color); // Przekazanie koloru do funkcji addMarker
      });

      this.generateAdjacencyGraph(); // Wygenerowanie macierzy sąsiedztwa po wczytaniu grafu
    };

    reader.readAsText(file);
  }

  /**
   * Metoda do dodawania markerów na mapie i aktualizacji tablicy markerów
   */
  addMarker(id, lat, lng, name, color) {
    const marker = L.marker([lat, lng]).addTo(this.map);

    // Dodajemy wiązanie popup z nazwą punktu
    marker.bindPopup(name).openPopup();

    const newMarker = new Marker(id, name, lat, lng, marker, color);
    this.markers.push(newMarker);

    updateCoordinatesTable(this.markers);
  }
  check() {
    console.log(this.markers);
  }
}

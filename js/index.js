import MapManager from "./classes/map-manager.js";

const mapManager = new MapManager();

/**
 * Metoda do aktualizowania tabeli z zaznaczonymi współrzędnymi
 */
export function updateCoordinatesTable(markers) {
  const tableBody = document.querySelector("#coordinatesTable tbody");
  tableBody.innerHTML = "";

    markers.forEach((marker, index) => {
      const name = marker.name;
      const lat = marker.lat.toFixed(6);
      const lng = marker.lng.toFixed(6);

      const row = `<tr>
                            <td>${name}</td>
                            <td>${lat}</td>
                            <td>${lng}</td>
                            <td><button class="removeButton" data-index="${index}">Remove</button></td>
                        </tr>`;
      tableBody.innerHTML += row;
    });

    const removeButtons = document.querySelectorAll(`.removeButton`)
    removeButtons.forEach(node => {
      node.addEventListener('click', (event) => {
        const nodeIndex = event.target.dataset.index;
        mapManager.removeMarker(nodeIndex);
      })
    })
}

document.getElementById("generateBtn").addEventListener("click", function () {
  mapManager.generateAdjacencyGraph();
});

document.getElementById("clearBtn").addEventListener("click", function () {
  mapManager.clearMarkers();
});

document.getElementById("clearLineBtn").addEventListener("click", function () {
  mapManager.clearConnections();
});

document.getElementById("saveBtn").addEventListener("click", function () {
  mapManager.saveGraph();
});

document
  .getElementById("fileInput")
  .addEventListener("change", function (event) {
    mapManager.loadGraph(event);
  });

window.onload = () => mapManager.initMap();

fetch('group.csv')
  .then(response => response.text())
  .then(text => {
    const lines = text.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());

    const idxName = headers.indexOf("Name");
    const idxAff = headers.indexOf("Affiliation");
    const idxCountry = headers.indexOf("Country");
    const idxRole = headers.indexOf("Role");
    const idxImage = headers.indexOf("Image");
    const idxEmail = headers.indexOf("Email");

    const teamGrid = document.getElementById("team-grid");

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue; // skip empty rows

      const cols = lines[i].split(',').map(c => c.trim());

      const name = cols[idxName] || "Unknown";
      const Aff = cols[idxAff] || "";
      const Country = cols[idxCountry] || "";
      const Role = cols[idxRole] || "";
      const Email = cols[idxEmail] || "";
      let image = cols[idxImage] || "";

      // If image column has only "x" or is empty → use default avatar
      if (image === "" || image.toLowerCase() === "x") {
        image = "default.jpg"; // <-- add an image to /images/
      }

      const card = document.createElement("div");
      card.classList.add("member");

      card.innerHTML = `
        <div class="avatar">
            <img src="media/${image}" alt="${name}">
        </div>
        <h3>${name}</h3>
        <p>${Aff}</p>
        <p>${Country}</p>
        <p><b>${Role}</b></p>
        <p><a href="mailto:${Email}">${Email}</a></p>
      `;

      teamGrid.appendChild(card);
    }
  });
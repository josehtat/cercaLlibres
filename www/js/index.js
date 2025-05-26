document.addEventListener('deviceready', onDeviceReady, false);

function onDeviceReady() {
  console.log("Dispositiu llest.");
}

window.onload = () => {
  console.log("Pàgina carregada completament. Inicialitzant...");
  var options = { swipeable: true };
  var el = document.querySelectorAll('.tabs');
  var instance = M.Tabs.init(el, options);

  // Gestor del botó de cerca
  document.getElementById('search-button').addEventListener('click', () => {
    const query = document.getElementById('search-input').value.trim();
    if (query) {
      searchBooks(query);
    }
  });
};

function searchBooks(query) {
  const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=30`;
  fetch(url)
    .then(response => response.json())
    .then(data => {
      const resultsList = document.getElementById('results-list');
      resultsList.innerHTML = '';
      if (data.docs && data.docs.length > 0) {
        data.docs.forEach(doc => {
          const title = doc.title || 'Sense títol';
          const author = doc.author_name ? doc.author_name.join(', ') : 'Autor desconegut';
          const workKey = doc.key; // e.g., "/works/OL12345W"

          const li = document.createElement('li');
          li.className = 'collection-item';
          li.innerHTML = `<span class="title"><strong>${title}</strong></span><br><em>${author}</em>`;
          li.addEventListener('click', () => {
            showBookDetails(workKey);
            const tabs = M.Tabs.getInstance(document.querySelector('.tabs'));
            tabs.select('details-tab');
          });
          resultsList.appendChild(li);
        });
      } else {
        resultsList.innerHTML = '<li class="collection-item">Cap resultat trobat.</li>';
      }
    })
    .catch(error => {
      console.error('Error en la cerca de llibres:', error);
    });
}

function showBookDetails(workKey) {
  const url = `https://openlibrary.org${workKey}.json`;
  fetch(url)
    .then(response => response.json())
    .then(data => {
      const detailsDiv = document.getElementById('book-details');
      const title = data.title || 'Sense títol';
      const description = data.description
        ? typeof data.description === 'string'
          ? data.description
          : data.description.value
        : 'Sense descripció disponible.';
      const authors = data.authors || [];

      // Obtenir noms dels autors
      const authorPromises = authors.map(authorRef =>
        fetch(`https://openlibrary.org${authorRef.author.key}.json`)
          .then(response => response.json())
          .then(authorData => authorData.name)
          .catch(() => 'Autor desconegut')
      );

      Promise.all(authorPromises).then(authorNames => {
        const authorList = authorNames.join(', ');
        detailsDiv.innerHTML = `
          <h5>${title}</h5>
          <p><strong>Autor(s):</strong> ${authorList}</p>
          <p><strong>Descripció:</strong> ${description}</p>
        `;
      });
    })
    .catch(error => {
      console.error('Error en obtenir els detalls del llibre:', error);
    });
}

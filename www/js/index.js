document.addEventListener('deviceready', onDeviceReady, false);
function onDeviceReady() {
  console.log("Dispositiu llest.");
}

window.onload = () => {
  console.log("Pàgina carregada completament. Inicialitzant...");
  // Inicialitza tabs i sidenav si cal
  M.Tabs.init(document.querySelectorAll('.tabs'), { swipeable: true });

  // Botó cerca per text
  document.getElementById('search-button').addEventListener('click', () => {
    const query = document.getElementById('search-input').value.trim();
    if (query) searchBooks(query);
  });

  // Botó cerca per ISBN
  document.getElementById('isbn-button').addEventListener('click', () => {
    const isbn = document.getElementById('isbn-input').value.trim();
    if (isbn) searchByISBN(isbn);
  });
};

async function searchBooks(query) {
  const resultsList = document.getElementById('results-list');
  const loading = document.getElementById('loading');
  // Neteja i mostra spinner
  resultsList.innerHTML = '';
  loading.style.display = 'block';

  try {
    const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=30`;
    const res = await fetch(url);
    const data = await res.json();
    loading.style.display = 'none';

    if (data.docs && data.docs.length) {
      data.docs.forEach(doc => {
        const title     = doc.title || 'Sense títol';
        const author    = doc.author_name ? doc.author_name.join(', ') : 'Autor desconegut';
        const year      = doc.first_publish_year || '—';
        const publisher = doc.publisher ? doc.publisher[0] : '—';
        const coverId   = doc.cover_i;
        const coverUrl  = coverId
          ? `https://covers.openlibrary.org/b/id/${coverId}-S.jpg`
          : 'img/no_cover.png';

        const li = document.createElement('li');
        li.className = 'collection-item avatar';
        li.innerHTML = `
          <img src="${coverUrl}" alt="Portada" class="circle">
          <span class="title"><strong>${title}</strong></span>
          <p>
            <em>${author}</em><br>
            <small>Any: ${year} • Editorial: ${publisher}</small>
          </p>
        `;
        li.addEventListener('click', () => {
          showBookDetails(doc.key);
          M.Tabs.getInstance(document.querySelector('.tabs')).select('details-tab');
        });
        resultsList.appendChild(li);
      });
    } else {
      resultsList.innerHTML = '<li class="collection-item">Cap resultat trobat.</li>';
    }
  } catch (err) {
    loading.style.display = 'none';
    console.error('Error en la cerca de llibres:', err);
    resultsList.innerHTML = '<li class="collection-item red-text">Error en la petició.</li>';
  }
}

async function searchByISBN(isbn) {
  const detailsDiv = document.getElementById('book-details');
  const loading    = document.getElementById('loading');

  // 1. Cambiamos a details-tab y mostramos spinner
  M.Tabs.getInstance(document.querySelector('.tabs')).select('details-tab');
  detailsDiv.innerHTML = '';
  loading.style.display = 'block';

  try {
    const edRes = await fetch(`https://openlibrary.org/isbn/${isbn}.json`);
    if (!edRes.ok) throw new Error('No trobat');
    const edition = await edRes.json();

    // 2. Ocultamos spinner antes de renderizar detalle
    loading.style.display = 'none';

    // 3. Si té works, reutilitzem showBookDetails
    if (edition.works && edition.works.length) {
      return showBookDetails(edition.works[0].key);
    }

    // 4. Render directe de l'edició
    const title       = edition.title || 'Sense títol';
    const publishers  = edition.publishers?.join(', ') || '—';
    const publishDate = edition.publish_date || '—';
    const pages       = edition.number_of_pages || '—';
    const coverId     = edition.covers?.[0];
    const coverUrl    = coverId
      ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`
      : 'img/no_cover.png';

    detailsDiv.innerHTML = `
      <div class="row">
        <div class="col s12 m4 center-align">
          <img src="${coverUrl}" alt="Portada" class="responsive-img" style="max-height:300px;">
        </div>
        <div class="col s12 m8">
          <h5>${title}</h5>
          <p><strong>Editorial:</strong> ${publishers}</p>
          <p><strong>Publicació:</strong> ${publishDate}</p>
          <p><strong>Pàgines:</strong> ${pages}</p>
          <p><strong>ISBN:</strong> ${isbn}</p>
        </div>
      </div>
    `;
  } catch (err) {
    // Ocultem spinner i mostrem error
    loading.style.display = 'none';
    console.error('Error ISBN:', err);
    detailsDiv.innerHTML = `<p class="red-text">No s'ha trobat cap llibre amb ISBN <strong>${isbn}</strong>.</p>`;
  }
}


async function showBookDetails(workKey) {
  const detailsDiv = document.getElementById('book-details');
  detailsDiv.innerHTML = '<p>Carregant detalls…</p>';

  try {
    const workRes = await fetch(`https://openlibrary.org${workKey}.json`);
    const work    = await workRes.json();

    // Autors
    const authorNames = await Promise.all(
      (work.authors || []).map(aRef =>
        fetch(`https://openlibrary.org${aRef.author.key}.json`)
          .then(r => r.json()).then(a => a.name)
          .catch(() => 'Autor desconegut')
      )
    );

    // Dades del work
    const title       = work.title || 'Sense títol';
    const description = work.description
      ? (typeof work.description === 'string' ? work.description : work.description.value)
      : 'Sense descripció disponible.';
    const subjects    = work.subjects ? work.subjects.slice(0,10).join(', ') : '—';
    const created     = work.created ? new Date(work.created.value).getFullYear() : '—';

    // Dades de l'edició principal
    let edition = null;
    const editionKey = work.edition_key?.[0];
    if (editionKey) {
      try {
        const edRes = await fetch(`https://openlibrary.org/books/${editionKey}.json`);
        edition = await edRes.json();
      } catch(e) {
        console.warn('No s’ha pogut obtenir l’edition:', e);
      }
    }

    // Portada
    const coverId = edition?.covers?.[0] || work.covers?.[0];
    const coverUrl = coverId
      ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`
      : 'img/no_cover.png';

    // Camps d'edition
    const publishers  = edition?.publishers?.join(', ') || '—';
    const publishDate = edition?.publish_date || '—';
    const pages       = edition?.number_of_pages || '—';
    const isbn        = edition?.isbn_10
      ? edition.isbn_10.join(', ')
      : edition?.isbn_13
        ? edition.isbn_13.join(', ')
        : '—';

    // Render final
    detailsDiv.innerHTML = `
      <div class="row">
        <div class="col s12 m4 center-align">
          <img src="${coverUrl}" alt="Portada" class="responsive-img" style="max-height: 300px;">
        </div>
        <div class="col s12 m8">
          <h5>${title}</h5>
          <p><strong>Autor(s):</strong> ${authorNames.join(', ')}</p>
          <p><strong>Temàtiques:</strong> ${subjects}</p>
          <p><strong>Creat:</strong> ${created}</p>
          <p><strong>Editorial:</strong> ${publishers}</p>
          <p><strong>Publicació:</strong> ${publishDate}</p>
          <p><strong>Pàgines:</strong> ${pages}</p>
          <p><strong>ISBN:</strong> ${isbn}</p>
          <p><strong>Descripció:</strong><br>${description}</p>
        </div>
      </div>
    `;
  } catch (err) {
    console.error('Error carregant detalls:', err);
    detailsDiv.innerHTML = `<p class="red-text">No s'han pogut carregar els detalls.</p>`;
  }
}

const API_KEY = 'c650cb1d';
const popularMovies = ["Avengers", "Inception", "The Matrix", "Titanic", "Star Wars"];
let currentMovies = [];

const filters = {
  genres: [],
  yearFrom: null,
  yearTo: null,
};

document.addEventListener('DOMContentLoaded', () => {
 
  loadPopularMovies();

  document.querySelectorAll('.genre-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      this.classList.toggle('active');
      filters.genres = Array.from(document.querySelectorAll('.genre-btn.active')).map(b => b.dataset.genre.toLowerCase());
      applyFilters();
    });
  });

  document.getElementById('yearFrom').addEventListener('input', e => {
    const val = parseInt(e.target.value);
    filters.yearFrom = isNaN(val) ? null : val;
    applyFilters();
  });

  document.getElementById('yearTo').addEventListener('input', e => {
    const val = parseInt(e.target.value);
    filters.yearTo = isNaN(val) ? null : val;
    applyFilters();
  });
;

 

  const closeBtn = document.querySelector('#movieDetailModal .close-btn');
  if (closeBtn) {
    closeBtn.onclick = function() {
      document.getElementById('movieDetailModal').style.display = 'none';
    };
  }

  document.getElementById('movieDetailModal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) {
      e.currentTarget.style.display = 'none';
    }
  });
});

function getCheckedValues(name) {
  return Array.from(document.querySelectorAll(`input[name="${name}"]:checked`)).map(cb => cb.value.toLowerCase());
}

async function loadPopularMovies() {
  const resultDiv = document.getElementById('result');
  resultDiv.innerHTML = '<p>Ładowanie popularnych filmów...</p>';

  let movies = [];

  for (const title of popularMovies) {
    try {
      const res = await fetch(`https://www.omdbapi.com/?t=${encodeURIComponent(title)}&apikey=${API_KEY}`);
      const data = await res.json();
      if (data.Response === 'True') movies.push(data);
    } catch {
      
    }
  }

  currentMovies = movies;
  renderMovies(movies);
}

function renderMovies(movies) {
  const resultDiv = document.getElementById('result');
  if (!movies.length) {
    resultDiv.innerHTML = '<p>Brak filmów do wyświetlenia.</p>';
    return;
  }

  let html = '';
  movies.forEach(movie => {
    html += `
      <div class="movie-card" data-imdbid="${movie.imdbID}">
        <img src="${movie.Poster !== 'N/A' ? movie.Poster : 'https://via.placeholder.com/100x150?text=Brak+plakatu'}" alt="${movie.Title}">
        <div class="movie-info">
          <h3>${movie.Title} (${movie.Year})</h3>
          <p>Gatunek: ${movie.Genre}</p>
          <p>Ocena IMDB: ${movie.imdbRating}</p>
          <a class="watch-btn" href="https://www.google.com/search?q=${encodeURIComponent(movie.Title + ' gdzie obejrzeć')}" target="_blank">Gdzie obejrzeć?</a>
        </div>
      </div>
    `;
  });

  resultDiv.innerHTML = html;

  document.querySelectorAll('.movie-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.classList.contains('watch-btn')) return;
      const imdbID = card.getAttribute('data-imdbid');
      openMovieDetails(imdbID);
    });
  });
}

function applyFilters() {
  let filtered = currentMovies;

  
  if (filters.genres.length > 0) {
    filtered = filtered.filter(movie => {
      const genres = movie.Genre.toLowerCase();
      return filters.genres.some(g => genres.includes(g));
    });
  }

 
  if (filters.yearFrom !== null) {
    filtered = filtered.filter(movie => parseInt(movie.Year) >= filters.yearFrom);
  }


  if (filters.yearTo !== null) {
    filtered = filtered.filter(movie => parseInt(movie.Year) <= filters.yearTo);
  }


  renderMovies(filtered);
}

async function openMovieDetails(imdbID) {
  const modal = document.getElementById('movieDetailModal');
  const content = document.getElementById('movieDetailsContent');
  content.innerHTML = '<p>Ładowanie szczegółów filmu...</p>';
  modal.style.display = 'flex';

  try {
    const res = await fetch(`https://www.omdbapi.com/?i=${imdbID}&apikey=${API_KEY}&plot=full`);
    const movie = await res.json();

    if (movie.Response !== 'True') {
      content.innerHTML = '<p>Nie udało się załadować szczegółów.</p>';
      return;
    }


    content.innerHTML = `
      <img src="${movie.Poster !== 'N/A' ? movie.Poster : 'https://via.placeholder.com/150x220?text=Brak+plakatu'}" alt="${movie.Title}">
      <h2>${movie.Title} (${movie.Year})</h2>
      <p><strong>Gatunek:</strong> ${movie.Genre}</p>
      <p><strong>Reżyser:</strong> ${movie.Director}</p>
      <p><strong>Obsada:</strong> ${movie.Actors}</p>
      <p><strong>Ocena IMDB:</strong> ${movie.imdbRating}</p>
      <p><strong>Opis:</strong> ${movie.Plot}</p>
      <a class="watch-btn" href="https://www.google.com/search?q=${encodeURIComponent(movie.Title + ' gdzie obejrzeć')}" target="_blank">Gdzie obejrzeć?</a>
      <a class="watch-btn" style="background:#e52d27;margin-left:10px;" href="https://www.youtube.com/results?search_query=${encodeURIComponent(movie.Title + ' trailer')}" target="_blank">Zwiastun na YouTube</a>
      <h4>Podobne Filmy:</h4>
      <div class="series-list" id="seriesList">Ładowanie...</div>
    `;


    const baseTitle = movie.Title.split(':')[0].split('-')[0].trim();
    const seriesMovies = await fetchSeriesMovies(baseTitle, imdbID);

    const seriesListDiv = document.getElementById('seriesList');
    if (seriesMovies.length === 0) {
      seriesListDiv.innerHTML = '<p>Brak filmów z serii.</p>';
    } else {
      seriesListDiv.innerHTML = seriesMovies.map(m => `
        <div class="series-movie" data-imdbid="${m.imdbID}">
          <img src="${m.Poster !== 'N/A' ? m.Poster : 'https://via.placeholder.com/100x150?text=Brak'}" alt="${m.Title}">
          <p>${m.Title}</p>
        </div>
      `).join('');

      
      document.querySelectorAll('.series-movie').forEach(el => {
        el.addEventListener('click', () => {
          const id = el.getAttribute('data-imdbid');
          openMovieDetails(id);
        });
      });
    }

  } catch (error) {
    content.innerHTML = `<p>Błąd podczas pobierania danych: ${error.message}</p>`;
  }
}


async function fetchSeriesMovies(baseTitle, excludeID) {
  try {
    const res = await fetch(`https://www.omdbapi.com/?s=${encodeURIComponent(baseTitle)}&apikey=${API_KEY}`);
    const data = await res.json();
    if (data.Response !== 'True') return [];

    
    const filtered = data.Search.filter(m => 
      m.imdbID !== excludeID && m.Title.toLowerCase().includes(baseTitle.toLowerCase())
    );

    
    const detailedMovies = [];
    for (const movie of filtered) {
      try {
        const res = await fetch(`https://www.omdbapi.com/?i=${movie.imdbID}&apikey=${API_KEY}`);
        const details = await res.json();
        if (details.Response === 'True') detailedMovies.push(details);
      } catch {}
    }

    return detailedMovies;
  } catch {
    return [];
  }
}

async function searchMovie() {
  const query = document.getElementById('searchInput').value.trim();
  if (!query) {
    loadPopularMovies();
    return;
  }
  const resultDiv = document.getElementById('result');
  resultDiv.innerHTML = '<p>Wyszukiwanie...</p>';
  try {
    const res = await fetch(`https://www.omdbapi.com/?s=${encodeURIComponent(query)}&apikey=${API_KEY}`);
    const data = await res.json();
    if (data.Response !== 'True') {
      resultDiv.innerHTML = '<p>Nie znaleziono filmów.</p>';
      currentMovies = [];
      return;
    }
  
    const movies = [];
    for (const m of data.Search) {
      const detRes = await fetch(`https://www.omdbapi.com/?i=${m.imdbID}&apikey=${API_KEY}`);
      const det = await detRes.json();
      if (det.Response === 'True') movies.push(det);
    }
    currentMovies = movies;
    applyFilters();
  } catch (e) {
    resultDiv.innerHTML = '<p>Błąd podczas wyszukiwania.</p>';
  }
}

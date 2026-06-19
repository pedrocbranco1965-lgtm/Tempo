// NOTE: In a real project, avoid committing your real API key.
// For demo/class use only.
const API_KEY = '9a26914e58461d57f9aacaa64c17898c';

// API endpoints
const GEOCODING_URL = 'https://api.openweathermap.org/geo/1.0/direct';
const FORECAST_URL = 'https://api.openweathermap.org/data/2.5/forecast';

// DOM elements - matching the accessible HTML IDs
const searchForm = document.querySelector('#search-form');
const cityInput = document.querySelector('#city-input');
const clearBtn = document.querySelector('#clear-btn');
const messageEl = document.querySelector('#message');
const currentWeatherEl = document.querySelector('#current-weather');
const forecastEl = document.querySelector('#forecast');
const searchHistoryEl = document.querySelector('#search-history');

// LocalStorage key for search history
const STORAGE_KEY = 'weatherSearchHistory';

// ========================================
// EVENT LISTENERS
// ========================================

// Search form submit handler
searchForm.addEventListener('submit', function (event) {
	event.preventDefault();

	const city = cityInput.value.trim();

	if (!city) {
		setMessage('Please enter a city name.', true);
		return;
	}

	fetchWeatherData(city);
});

// Clear button handler
clearBtn.addEventListener('click', function () {
	// Clear localStorage
	localStorage.removeItem(STORAGE_KEY);

	// Re-render empty history
	renderHistory();

	// Clear the input field
	cityInput.value = '';

	// Show confirmation message
	setMessage('Search history cleared.', false);
});

// Search history click handler
searchHistoryEl.addEventListener('click', function (event) {
	if (event.target.matches('.history-btn')) {
		const city = event.target.dataset.city;
		fetchWeatherData(city);
	}
});

// ========================================
// API FUNCTIONS
// ========================================

// Step 1: Convert city name to coordinates using Geocoding API
async function getCoordinates(city) {
	const geoUrl = `${GEOCODING_URL}?q=${encodeURIComponent(city)}&limit=1&appid=${API_KEY}`;

	try {
		const response = await fetch(geoUrl);

		if (!response.ok) {
			throw new Error('Geocoding request failed');
		}

		const data = await response.json();

		if (data.length === 0) {
			throw new Error('City not found. Please try another city.');
		}

		const { lat, lon, name } = data[0];
		return { lat, lon, name };
	} catch (error) {
		throw error;
	}
}

// Step 2: Get forecast data using coordinates
async function getForecast(lat, lon) {
	const forecastUrl = `${FORECAST_URL}?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=imperial`;

	try {
		const response = await fetch(forecastUrl);

		if (!response.ok) {
			throw new Error('Forecast request failed');
		}

		const data = await response.json();
		return data;
	} catch (error) {
		throw error;
	}
}

// Main function: Fetch and render all weather data
async function fetchWeatherData(city) {
	setMessage('Loading weather data...');
	clearWeather();

	try {
		// Step 1: Get coordinates from city name
		const { lat, lon, name } = await getCoordinates(city);

		// Step 2: Get forecast data using coordinates
		const forecastData = await getForecast(lat, lon);

		// Step 3: Process the forecast data
		const { current, daily } = processForecastData(forecastData);

		// Step 4: Render to DOM
		renderCurrentWeather(name, current);
		renderForecast(daily);

		// Step 5: Update message and save to history
		setMessage(`Showing weather for ${name}.`, false);
		addCityToHistory(name);
	} catch (error) {
		console.error(error);
		setMessage(error.message || 'Unable to fetch weather data.', true);
	}
}

// ========================================
// DATA PROCESSING
// ========================================

// Process forecast data to extract current weather and daily forecasts
function processForecastData(forecastData) {
	const list = forecastData.list;

	// Current conditions: Use the first entry in the forecast list
	const current = list[0];

	// Group forecast entries by date
	const byDate = {};
	list.forEach(item => {
		const [date] = item.dt_txt.split(' ');
		if (!byDate[date]) {
			byDate[date] = [];
		}
		byDate[date].push(item);
	});

	// Get the next 5 unique dates
	const dates = Object.keys(byDate);
	const nextFiveDates = dates.slice(0, 5);

	// For each date, find the entry closest to 12:00:00 (noon)
	const daily = nextFiveDates.map(date => {
		const entries = byDate[date];

		// Try to find the noon entry
		let target = entries.find(entry => entry.dt_txt.includes('12:00:00'));

		// Fallback: use middle entry if noon not available
		if (!target) {
			target = entries[Math.floor(entries.length / 2)] || entries[0];
		}

		return target;
	});

	return { current, daily };
}

// ========================================
// RENDER FUNCTIONS
// ========================================

// Render current weather card
function renderCurrentWeather(cityName, current) {
	currentWeatherEl.innerHTML = '';

	const date = new Date(current.dt * 1000); // Convert Unix timestamp to Date
	const iconCode = current.weather[0]?.icon;
	const description = current.weather[0]?.description ?? '';
	const iconUrl = iconCode ? `https://openweathermap.org/img/wn/${iconCode}@2x.png` : '';

	// Create card structure
	const card = document.createElement('div');
	card.className = 'card border-0 bg-transparent';

	const cardBody = document.createElement('div');
	cardBody.className = 'card-body d-flex align-items-center justify-content-between';

	// Left side: City info and weather details
	const leftContainer = document.createElement('div');
	leftContainer.className = 'flex-grow-1';

	// City name and date with icon
	const headerContainer = document.createElement('div');
	headerContainer.className = 'd-flex align-items-center mb-3';

	const title = document.createElement('h3');
	title.className = 'h4 mb-0 me-2';
	title.textContent = `${cityName} (${date.toLocaleDateString()})`;

	headerContainer.appendChild(title);

	if (iconUrl) {
		const iconImg = document.createElement('img');
		iconImg.src = iconUrl;
		iconImg.alt = description;
		iconImg.className = 'weather-icon';
		iconImg.style.width = '75px';
		iconImg.style.height = '75px';
		headerContainer.appendChild(iconImg);
	}

	// Weather details
	const tempEl = document.createElement('p');
	tempEl.className = 'mb-2';
	tempEl.innerHTML = `<strong>Temperature:</strong> ${Math.round(current.main.temp)} °F`;

	const windEl = document.createElement('p');
	windEl.className = 'mb-2';
	windEl.innerHTML = `<strong>Wind:</strong> ${current.wind.speed.toFixed(1)} MPH`;

	const humidityEl = document.createElement('p');
	humidityEl.className = 'mb-2';
	humidityEl.innerHTML = `<strong>Humidity:</strong> ${current.main.humidity}%`;

	const descEl = document.createElement('p');
	descEl.className = 'mb-0 text-capitalize';
	descEl.innerHTML = `<strong>Conditions:</strong> ${description}`;

	// Append all elements
	leftContainer.append(headerContainer, tempEl, windEl, humidityEl, descEl);
	cardBody.appendChild(leftContainer);
	card.appendChild(cardBody);
	currentWeatherEl.appendChild(card);
}

// Render 5-day forecast cards
function renderForecast(daily) {
	forecastEl.innerHTML = '';

	daily.forEach(item => {
		const date = new Date(item.dt * 1000);
		const iconCode = item.weather[0]?.icon;
		const description = item.weather[0]?.description ?? '';
		const iconUrl = iconCode ? `https://openweathermap.org/img/wn/${iconCode}@2x.png` : '';

		// Create Bootstrap column
		const col = document.createElement('div');
		col.className = 'col-12 col-sm-6 col-md-4 col-lg';
		col.setAttribute('role', 'listitem');

		// Create card
		const card = document.createElement('div');
		card.className = 'card h-100';

		const cardBody = document.createElement('div');
		cardBody.className = 'card-body text-center';

		// Date heading
		const dateHeading = document.createElement('h3');
		dateHeading.className = 'h6 card-title mb-3';
		dateHeading.textContent = date.toLocaleDateString(undefined, {
			month: 'numeric',
			day: 'numeric',
			year: 'numeric',
		});

		// Weather icon
		if (iconUrl) {
			const img = document.createElement('img');
			img.src = iconUrl;
			img.alt = description;
			img.className = 'weather-icon mb-2';
			img.style.width = '60px';
			img.style.height = '60px';
			cardBody.appendChild(dateHeading);
			cardBody.appendChild(img);
		} else {
			cardBody.appendChild(dateHeading);
		}

		// Weather details
		const tempEl = document.createElement('p');
		tempEl.className = 'card-text mb-2';
		tempEl.innerHTML = `<strong>Temp:</strong> ${Math.round(item.main.temp)} °F`;

		const windEl = document.createElement('p');
		windEl.className = 'card-text mb-2';
		windEl.innerHTML = `<strong>Wind:</strong> ${item.wind.speed.toFixed(1)} MPH`;

		const humidityEl = document.createElement('p');
		humidityEl.className = 'card-text mb-2';
		humidityEl.innerHTML = `<strong>Humidity:</strong> ${item.main.humidity}%`;

		const descEl = document.createElement('p');
		descEl.className = 'card-text mb-0 text-capitalize';
		descEl.innerHTML = `<strong>Conditions:</strong> ${description}`;

		cardBody.append(tempEl, windEl, humidityEl, descEl);
		card.appendChild(cardBody);
		col.appendChild(card);
		forecastEl.appendChild(col);
	});

	if (!daily.length) {
		const p = document.createElement('p');
		p.className = 'text-muted';
		p.textContent = 'No forecast data available.';
		forecastEl.appendChild(p);
	}
}

// ========================================
// SEARCH HISTORY FUNCTIONS
// ========================================

// Load search history from localStorage
function loadHistory() {
	const raw = localStorage.getItem(STORAGE_KEY);
	if (!raw) return [];

	try {
		return JSON.parse(raw);
	} catch {
		return [];
	}
}

// Save search history to localStorage
function saveHistory(history) {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

// Add city to search history
function addCityToHistory(city) {
	let history = loadHistory();

	// Normalize city name to avoid duplicates
	const normalized = city.toLowerCase();

	// Check if city already exists (case-insensitive)
	if (history.some(c => c.toLowerCase() === normalized)) {
		return; // Don't add duplicates
	}

	// Add to front of array
	history.unshift(city);

	// Keep only the last 8 searches
	history = history.slice(0, 8);

	saveHistory(history);
	renderHistory();
}

// Render search history buttons
function renderHistory() {
	const history = loadHistory();
	searchHistoryEl.innerHTML = '';

	if (history.length === 0) {
		const emptyMsg = document.createElement('p');
		emptyMsg.className = 'text-muted small';
		emptyMsg.textContent = 'No search history yet.';
		searchHistoryEl.appendChild(emptyMsg);
		return;
	}

	history.forEach(city => {
		const btn = document.createElement('button');
		btn.className = 'btn btn-secondary w-100 mb-2 history-btn';
		btn.textContent = city;
		btn.dataset.city = city;
		btn.setAttribute('type', 'button');
		btn.setAttribute('aria-label', `View weather for ${city}`);
		searchHistoryEl.appendChild(btn);
	});
}

// ========================================
// UTILITY FUNCTIONS
// ========================================

// Clear current weather and forecast displays
function clearWeather() {
	currentWeatherEl.innerHTML = '';
	forecastEl.innerHTML = '';
}

// Set message text and style
function setMessage(text, isError = false) {
	messageEl.textContent = text;
	messageEl.classList.toggle('text-danger', isError);
	messageEl.classList.toggle('text-success', !isError && text.includes('Showing'));
	messageEl.classList.toggle('text-muted', !isError && !text.includes('Showing'));
}

// ========================================
// INITIALIZATION
// ========================================

// Initialize page on load
(function init() {
	// Render any existing search history
	renderHistory();

	// Auto-load the most recent search if available
	const history = loadHistory();
	if (history.length > 0) {
		fetchWeatherData(history[0]);
	}
})();

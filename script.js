let isCelsius = true;
let currentWeather = null;
let dailyForecast = null;

// Toggle loading spinner and button states
function setLoading(isLoading) {
    const spinner = document.getElementById('loadingSpinner');
    const searchButton = document.getElementById('searchButton');
    const geoButton = document.getElementById('geoButton');

    if (isLoading) {
        spinner.classList.remove('hidden');
        searchButton.disabled = true;
        geoButton.disabled = true;
        searchButton.classList.add('opacity-50', 'cursor-not-allowed');
        geoButton.classList.add('opacity-50', 'cursor-not-allowed');
    } else {
        spinner.classList.add('hidden');
        searchButton.disabled = false;
        geoButton.disabled = false;
        searchButton.classList.remove('opacity-50', 'cursor-not-allowed');
        geoButton.classList.remove('opacity-50', 'cursor-not-allowed');
    }
}

// Display current weather
function displayWeather(city, country, weather) {
    const container = document.getElementById('weatherContainer');
    currentWeather = weather;

    container.innerHTML = `
        <h2 class="text-2xl font-bold text-green-700 dark:text-green-300">${city}, ${country}</h2>
        <p class="text-lg">🌡 <strong>Temperature:</strong> <span id="temperatureValue">${weather.temperature}</span>°<span id="unitLabel">C</span></p>
        <p class="text-lg">💨 <strong>Wind Speed:</strong> ${weather.windspeed} km/h</p>
        <p class="text-lg">🌥 <strong>Weather Code:</strong> ${weather.weathercode}</p>
    `;
    container.classList.remove('hidden');
}

// Display 5-day forecast
function displayForecast(daily) {
    const container = document.getElementById('forecastContainer');
    dailyForecast = daily;
    container.innerHTML = '';

    for (let i = 0; i < 5; i++) {
        const day = daily.time[i];
        const max = isCelsius ? daily.temperature_2m_max[i] : toFahrenheit(daily.temperature_2m_max[i]);
        const min = isCelsius ? daily.temperature_2m_min[i] : toFahrenheit(daily.temperature_2m_min[i]);

        const item = document.createElement('div');
        item.className = 'p-4 bg-white dark:bg-gray-800 rounded-lg shadow text-center';
        item.innerHTML = `
            <h3 class="font-semibold">${day}</h3>
            <p>🔺 Max: ${max.toFixed(1)}°${isCelsius ? 'C' : 'F'}</p>
            <p>🔻 Min: ${min.toFixed(1)}°${isCelsius ? 'C' : 'F'}</p>
            <p>Code: ${daily.weathercode[i]}</p>
        `;
        container.appendChild(item);
    }
    container.classList.remove('hidden');
}

// Initialize Leaflet map
function initializeMap(lat, lon) {
    const map = L.map('map').setView([lat, lon], 10);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
    L.marker([lat, lon]).addTo(map).bindPopup('Selected Location').openPopup();
}

// Convert °C ↔ °F
function toFahrenheit(c) {
    return (c * 9 / 5) + 32;
}
function toCelsius(f) {
    return (f - 32) * 5 / 9;
}

// Update temp display when toggling unit
function updateTemperatures() {
    if (!currentWeather || !dailyForecast) return;

    const temperatureValue = document.getElementById('temperatureValue');
    const unitLabel = document.getElementById('unitLabel');

    const temp = currentWeather.temperature;
    temperatureValue.textContent = isCelsius ? temp : toFahrenheit(temp).toFixed(1);
    unitLabel.textContent = isCelsius ? 'C' : 'F';

    displayForecast(dailyForecast);
}

// Show error
function showError(message) {
    const err = document.getElementById('errorContainer');
    const weatherContainer = document.getElementById('weatherContainer');
    const forecastContainer = document.getElementById('forecastContainer');

    err.innerHTML = `<p class="text-red-500">${message}</p>`;
    weatherContainer.classList.add('hidden');
    forecastContainer.classList.add('hidden');
}

// Main fetch method
async function fetchWeatherByCoords(lat, lon, city = 'Your Location', country = '') {
    setLoading(true);
    try {
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=auto`);
        if (!res.ok) throw new Error("Failed to fetch weather data.");

        const data = await res.json();
        if (!data.current_weather) throw new Error("Weather data unavailable.");

        displayWeather(city, country, data.current_weather);
        displayForecast(data.daily);
        initializeMap(lat, lon);
    } catch (err) {
        showError(err.message);
    } finally {
        setLoading(false);
    }
}

// Search by city name
async function onSearchClick() {
    const city = document.getElementById('searchInput').value.trim();
    if (!city) return showError('Please enter a city name.');
    document.getElementById('errorContainer').innerHTML = '';

    try {
        setLoading(true);
        const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`);
        if (!geoRes.ok) throw new Error("Location not found.");
        const geoData = await geoRes.json();
        if (!geoData.results || geoData.results.length === 0) throw new Error("City not found.");

        const { latitude, longitude, name, country } = geoData.results[0];
        fetchWeatherByCoords(latitude, longitude, name, country);
    } catch (err) {
        showError(err.message);
    } finally {
        setLoading(false);
    }
}

// Geolocation
document.getElementById('geoButton').addEventListener('click', () => {
    document.getElementById('errorContainer').innerHTML = '';
    if (!navigator.geolocation) {
        return showError("Geolocation not supported.");
    }
    navigator.geolocation.getCurrentPosition(
        pos => {
            const { latitude, longitude } = pos.coords;
            fetchWeatherByCoords(latitude, longitude);
        },
        err => showError("Location access denied.")
    );
});

// Toggle unit
document.getElementById('unitToggle').addEventListener('click', () => {
    isCelsius = !isCelsius;
    document.getElementById('unitToggle').textContent = isCelsius ? 'Switch to °F' : 'Switch to °C';
    updateTemperatures();
});

// Dark mode toggle
document.getElementById('darkModeToggle').addEventListener('click', () => {
    document.documentElement.classList.toggle('dark');
});

// Search button
document.getElementById('searchButton').addEventListener('click', onSearchClick);

// Service worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('service-worker.js')
            .then(reg => console.log('Service Worker registered:', reg.scope))
            .catch(err => console.error('Service Worker registration failed:', err));
    });
}

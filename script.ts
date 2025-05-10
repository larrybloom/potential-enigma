// === Interfaces for Open-Meteo API ===
interface CurrentWeather {
    temperature: number;
    windspeed: number;
    weathercode: number;
}

interface DailyForecast {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    weathercode: number[];
}

interface WeatherApiResponse {
    current_weather: CurrentWeather;
    daily: DailyForecast;
}

interface GeocodingResult {
    name: string;
    country: string;
    latitude: number;
    longitude: number;
}

interface GeocodingApiResponse {
    results: GeocodingResult[];
}

// === Globals ===
import * as L from 'leaflet';

let isCelsius = true;
let currentWeather: CurrentWeather | null = null;
let dailyForecast: DailyForecast | null = null;

// === DOM Elements ===
const searchInput = document.getElementById('searchInput') as HTMLInputElement;
const searchButton = document.getElementById('searchButton')!;
const geoButton = document.getElementById('geoButton')!;
const unitToggle = document.getElementById('unitToggle')!;
const darkModeToggle = document.getElementById('darkModeToggle')!;
const weatherContainer = document.getElementById('weatherContainer')!;
const forecastContainer = document.getElementById('forecastContainer')!;
const errorContainer = document.getElementById('errorContainer')!;
const loadingSpinner = document.getElementById('loadingSpinner')!;

// === Utility ===
function toFahrenheit(c: number): number {
    return (c * 9) / 5 + 32;
}

function toCelsius(f: number): number {
    return ((f - 32) * 5) / 9;
}

function setLoading(isLoading: boolean): void {
    loadingSpinner.classList.toggle('hidden', !isLoading);
    [searchButton, geoButton].forEach((btn) => {
        (btn as HTMLButtonElement).disabled = isLoading;
        btn.classList.toggle('opacity-50', isLoading);
        btn.classList.toggle('cursor-not-allowed', isLoading);
    });
}

// === Main Logic ===
async function onSearchClick(): Promise<void> {
    const city = searchInput.value.trim();
    if (!city) return showError('Please enter a city name.');
    errorContainer.innerHTML = '';
    setLoading(true);

    try {
        const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`);
        const geoData: GeocodingApiResponse = await geoRes.json();

        if (!geoData.results || geoData.results.length === 0) {
            throw new Error("City not found.");
        }

        const { latitude, longitude, name, country } = geoData.results[0];
        await fetchWeatherByCoords(latitude, longitude, name, country);
    } catch (err: any) {
        showError(err.message);
    } finally {
        setLoading(false);
    }
}

async function fetchWeatherByCoords(lat: number, lon: number, city = 'Your Location', country = ''): Promise<void> {
    setLoading(true);
    try {
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=auto`);
        const data: WeatherApiResponse = await res.json();

        if (!data.current_weather) throw new Error("Weather data unavailable.");

        currentWeather = data.current_weather;
        dailyForecast = data.daily;

        displayWeather(city, country, currentWeather);
        displayForecast(dailyForecast);
        initializeMap(lat, lon);
    } catch (err: any) {
        showError(err.message);
    } finally {
        setLoading(false);
    }
}

function displayWeather(city: string, country: string, weather: CurrentWeather): void {
    weatherContainer.innerHTML = `
        <h2 class="text-2xl font-bold text-green-700 dark:text-green-300">${city}, ${country}</h2>
        <p class="text-lg">🌡 <strong>Temperature:</strong> <span id="temperatureValue">${weather.temperature.toFixed(1)}</span>°<span id="unitLabel">${isCelsius ? 'C' : 'F'}</span></p>
        <p class="text-lg">💨 <strong>Wind Speed:</strong> ${weather.windspeed} km/h</p>
        <p class="text-lg">🌥 <strong>Weather Code:</strong> ${weather.weathercode}</p>
    `;
    weatherContainer.classList.remove('hidden');
}

function displayForecast(daily: DailyForecast): void {
    forecastContainer.innerHTML = '';

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
        forecastContainer.appendChild(item);
    }

    forecastContainer.classList.remove('hidden');
}

function updateTemperatures(): void {
    if (!currentWeather || !dailyForecast) return;

    const tempEl = document.getElementById('temperatureValue')!;
    const unitLabel = document.getElementById('unitLabel')!;
    const temp = currentWeather.temperature;

    tempEl.textContent = isCelsius ? temp.toFixed(1) : toFahrenheit(temp).toFixed(1);
    unitLabel.textContent = isCelsius ? 'C' : 'F';

    displayForecast(dailyForecast);
}

function showError(message: string): void {
    errorContainer.innerHTML = `<p class="text-red-500">${message}</p>`;
    weatherContainer.classList.add('hidden');
    forecastContainer.classList.add('hidden');
}

function initializeMap(lat: number, lon: number): void {
    const map = L.map('map').setView([lat, lon], 10);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
    L.marker([lat, lon]).addTo(map).bindPopup('Selected Location').openPopup();
}

// === Events ===
searchButton.addEventListener('click', onSearchClick);

geoButton.addEventListener('click', () => {
    errorContainer.innerHTML = '';
    if (!navigator.geolocation) return showError("Geolocation not supported.");

    navigator.geolocation.getCurrentPosition(
        (pos) => {
            const { latitude, longitude } = pos.coords;
            fetchWeatherByCoords(latitude, longitude);
        },
        () => showError("Location access denied.")
    );
});

unitToggle.addEventListener('click', () => {
    isCelsius = !isCelsius;
    unitToggle.textContent = isCelsius ? 'Switch to °F' : 'Switch to °C';
    updateTemperatures();
});

darkModeToggle.addEventListener('click', () => {
    document.documentElement.classList.toggle('dark');
});

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('service-worker.js')
            .then(reg => console.log('Service Worker registered:', reg.scope))
            .catch(err => console.error('Service Worker registration failed:', err));
    });
}

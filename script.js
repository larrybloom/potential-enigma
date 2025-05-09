async function onSearchClick() {
    const city = document.getElementById('searchInput').value.trim();
    const errorContainer = document.getElementById('errorContainer');
    const weatherContainer = document.getElementById('weatherContainer');

    // Clear previous output
    errorContainer.innerHTML = '';
    weatherContainer.innerHTML = '';

    if (!city) {
        showError('Please enter a city name.');
        return;
    }

    try {
        // 1. Get coordinates
        const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`);
        if (!geoRes.ok) throw new Error('Failed to fetch location.');

        const geoData = await geoRes.json();
        if (!geoData.results || geoData.results.length === 0) throw new Error('City not found.');

        const { latitude, longitude, name, country } = geoData.results[0];

        // 2. Get weather
        const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`);
        if (!weatherRes.ok) throw new Error('Failed to fetch weather data.');

        const weatherData = await weatherRes.json();
        displayWeather(name, country, weatherData.current_weather);
    } catch (err) {
        showError(err.message);
    }
}

function displayWeather(city, country, weather) {
    const container = document.getElementById('weatherContainer');

    if (!weather) {
        showError('No weather data available.');
        return;
    }

    container.innerHTML = `
        <h2>${city}, ${country}</h2>
        <p><strong>Temperature:</strong> ${weather.temperature}°C</p>
        <p><strong>Wind Speed:</strong> ${weather.windspeed} km/h</p>
        <p><strong>Weather Code:</strong> ${weather.weathercode}</p>
    `;
}

function showError(message) {
    const errorContainer = document.getElementById('errorContainer');
    errorContainer.innerHTML = `<p style="color: red;">${message}</p>`;
}

document.getElementById('searchButton').addEventListener('click', onSearchClick);

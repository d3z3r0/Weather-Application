class WeatherApp {
    constructor() {
        this.apiKey = 'YOUR_API_KEY';
        this.currentWeatherUrl = 'https://api.openweathermap.org/data/2.5/weather';
        this.forecastUrl = 'https://api.openweathermap.org/data/2.5/forecast';
        this.isGeolocationResult = false;
        
        this.initializeApp();
    }

    initializeApp() {
        this.bindEvents();
        this.initializeDarkMode();
        this.loadWeatherWithLocation();
        this.updateDateTime();
        
        setInterval(() => this.updateDateTime(), 60000);
    }

    bindEvents() {
        const searchBtn = document.getElementById('searchBtn');
        const cityInput = document.getElementById('cityInput');
        const darkModeToggle = document.getElementById('darkModeToggle');
        
        searchBtn.addEventListener('click', () => this.searchWeather());
        cityInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.searchWeather();
            }
        });
        
        if (darkModeToggle) {
            darkModeToggle.addEventListener('click', () => {
                this.toggleDarkMode();
            });
        }
    }

    // Dark Mode Functions
    initializeDarkMode() {
        const isDark = document.documentElement.classList.contains('dark');
        this.updateDarkModeIcon(isDark);
    }

    toggleDarkMode() {
        const isDark = document.documentElement.classList.contains('dark');
        
        if (isDark) {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
            this.updateDarkModeIcon(false);
        } else {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
            this.updateDarkModeIcon(true);
        }
    }

    updateDarkModeIcon(isDark) {
        const icon = document.getElementById('darkModeIcon');
        if (icon) {
            if (isDark) {
                icon.className = 'fas fa-sun text-sm sm:text-base lg:text-lg';
            } else {
                icon.className = 'fas fa-moon text-sm sm:text-base lg:text-lg';
            }
        }
    }

    // Weather Functions
    updateDateTime() {
        const now = new Date();
        const options = { 
            weekday: 'short', 
            day: 'numeric', 
            month: 'short' 
        };
        const dateStr = now.toLocaleDateString('en-US', options);
        document.getElementById('dateTime').textContent = `Today • ${dateStr}`;
    }

    async loadWeatherWithLocation() {
        try {
            if ("geolocation" in navigator) {
                document.getElementById('location').innerHTML = '<i class="fas fa-spinner fa-spin mr-1 sm:mr-2"></i>Getting your location...';
                const position = await this.getCurrentPosition();
                await this.getWeatherByCoordinates(position.coords.latitude, position.coords.longitude);
            } else {
                await this.getWeatherByCity('New Delhi');
            }
        } catch (error) {
            await this.getWeatherByCity('New Delhi');
        }
    }

    getCurrentPosition() {
        return new Promise((resolve, reject) => {
            const options = {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 300000
            };

            navigator.geolocation.getCurrentPosition(
                (position) => resolve(position),
                (error) => reject(new Error("Location access denied")),
                options
            );
        });
    }

    // FIXED: Search function that only clears input after successful search
    async searchWeather() {
        const cityInput = document.getElementById('cityInput');
        const searchBtn = document.getElementById('searchBtn');
        const city = cityInput.value.trim();
        
        if (!city) {
            alert('Please enter a city name');
            return;
        }
        
        try {
            // Show loading state
            cityInput.disabled = true;
            searchBtn.innerHTML = '<i class="fas fa-spinner fa-spin text-sm sm:text-base"></i>';
            
            await this.getWeatherByCity(city);
            
            // Clear input only after successful search
            setTimeout(() => {
                cityInput.value = '';
                cityInput.placeholder = `Last searched: ${city}`;
            }, 1000);
            
        } catch (error) {
            console.error('Search failed:', error);
            // Keep the input value for user to try again
            alert('City not found. Please check spelling and try again.');
        } finally {
            // Restore search button and enable input
            cityInput.disabled = false;
            searchBtn.innerHTML = '<i class="fas fa-search text-sm sm:text-base"></i>';
            cityInput.focus();
        }
    }

    async getWeatherByCoordinates(lat, lon) {
        try {
            this.isGeolocationResult = true;
            
            const currentResponse = await fetch(
                `${this.currentWeatherUrl}?lat=${lat}&lon=${lon}&appid=${this.apiKey}&units=metric`
            );
            
            if (!currentResponse.ok) {
                throw new Error('Weather data not found');
            }
            
            const currentData = await currentResponse.json();
            
            const forecastResponse = await fetch(
                `${this.forecastUrl}?lat=${lat}&lon=${lon}&appid=${this.apiKey}&units=metric`
            );
            
            const forecastData = await forecastResponse.json();
            
            this.updateCurrentWeather(currentData);
            this.updateForecast(forecastData);
            
        } catch (error) {
            await this.getWeatherByCity('New Delhi');
        }
    }

    async getWeatherByCity(city) {
        try {
            this.isGeolocationResult = false;
            
            const currentResponse = await fetch(
                `${this.currentWeatherUrl}?q=${city}&appid=${this.apiKey}&units=metric`
            );
            
            if (!currentResponse.ok) {
                throw new Error('Weather data not found');
            }
            
            const currentData = await currentResponse.json();
            
            const forecastResponse = await fetch(
                `${this.forecastUrl}?q=${city}&appid=${this.apiKey}&units=metric`
            );
            
            const forecastData = await forecastResponse.json();
            
            this.updateCurrentWeather(currentData);
            this.updateForecast(forecastData);
            
        } catch (error) {
            console.error('Error fetching weather data:', error);
            throw error; // Re-throw to handle in searchWeather
        }
    }

    updateCurrentWeather(data) {
        document.getElementById('temperature').textContent = `${Math.round(data.main.temp)}°C`;
        document.getElementById('condition').textContent = this.capitalizeFirstLetter(data.weather[0].description);
        
        const locationText = this.isGeolocationResult ? 
            `${data.name} (Current Location)` : 
            data.name;
        
        document.getElementById('location').innerHTML = `<i class="fas fa-map-marker-alt mr-1 sm:mr-2"></i>${locationText}`;
        
        this.updateWeatherIcon(data.weather[0].main);
        this.renderHighlights(data);
    }

    // Highlight Card Creation
    createHighlightCard(type, value, label, description, iconClass, iconColor, bgColor) {
        const card = document.createElement('div');
        card.className = 'bg-white dark:bg-gray-800 rounded-xl lg:rounded-2xl p-4 sm:p-5 lg:p-6 shadow-sm dark:shadow-gray-700/20';
        
        if (type === 'sunriseSunset') {
            card.innerHTML = `
                <div class="flex justify-between items-start mb-3 sm:mb-4">
                    <span class="text-gray-600 dark:text-gray-400 text-xs sm:text-sm">${label}</span>
                    <div class="${bgColor} p-1.5 sm:p-2 rounded-lg">
                        <i class="${iconClass} ${iconColor} text-sm"></i>
                    </div>
                </div>
                <div class="space-y-1 sm:space-y-2">
                    <div class="flex items-center">
                        <i class="fas fa-arrow-up text-orange-400 mr-1 sm:mr-2 text-sm"></i>
                        <span class="text-sm sm:text-base lg:text-lg font-medium text-gray-800 dark:text-white">${value.sunrise}</span>
                    </div>
                    <div class="flex items-center">
                        <i class="fas fa-arrow-down text-orange-600 mr-1 sm:mr-2 text-sm"></i>
                        <span class="text-sm sm:text-base lg:text-lg font-medium text-gray-800 dark:text-white">${value.sunset}</span>
                    </div>
                </div>
            `;
        } else if (type === 'humidity') {
            card.innerHTML = `
                <div class="flex justify-between items-start mb-3 sm:mb-4">
                    <span class="text-gray-600 dark:text-gray-400 text-xs sm:text-sm">${label}</span>
                    <div class="${bgColor} p-1.5 sm:p-2 rounded-lg">
                        <i class="${iconClass} ${iconColor} text-sm sm:text-base lg:text-lg"></i>
                    </div>
                </div>
                <div class="text-2xl sm:text-3xl font-semibold text-gray-800 dark:text-white mb-1 sm:mb-2">${value}</div>
                <div class="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-2 sm:mb-3">${description}</div>
                <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 sm:h-2">
                    <div class="bg-blue-500 h-1.5 sm:h-2 rounded-full" style="width: ${value.replace('%', '')}%"></div>
                </div>
            `;
        } else {
            card.innerHTML = `
                <div class="flex justify-between items-start mb-3 sm:mb-4">
                    <span class="text-gray-600 dark:text-gray-400 text-xs sm:text-sm">${label}</span>
                    <div class="${bgColor} p-1.5 sm:p-2 rounded-lg">
                        <i class="${iconClass} ${iconColor} text-sm sm:text-base lg:text-lg"></i>
                    </div>
                </div>
                <div class="text-2xl sm:text-3xl font-semibold text-gray-800 dark:text-white mb-1 sm:mb-2">${value}</div>
                <div class="text-xs sm:text-sm text-gray-500 dark:text-gray-400">${description}</div>
            `;
        }
        
        return card;
    }

    renderHighlights(data) {
        const sunrise = new Date(data.sys.sunrise * 1000);
        const sunset = new Date(data.sys.sunset * 1000);
        
        const highlights = [
            {
                type: 'uvIndex',
                value: this.calculateUVIndex(data.weather[0].main),
                label: 'UV Index',
                description: 'Moderate',
                iconClass: 'fas fa-sun',
                iconColor: 'text-orange-500',
                bgColor: 'bg-orange-100 dark:bg-orange-900/30'
            },
            {
                type: 'windSpeed',
                value: `${(data.wind.speed * 3.6).toFixed(2)} km/h`,
                label: 'Wind Status',
                description: 'WSW',
                iconClass: 'fas fa-wind',
                iconColor: 'text-blue-500',
                bgColor: 'bg-blue-100 dark:bg-blue-900/30'
            },
            {
                type: 'sunriseSunset',
                value: {
                    sunrise: sunrise.toLocaleTimeString('en-US', { 
                        hour: 'numeric', 
                        minute: '2-digit',
                        hour12: true 
                    }),
                    sunset: sunset.toLocaleTimeString('en-US', { 
                        hour: 'numeric', 
                        minute: '2-digit',
                        hour12: true 
                    })
                },
                label: 'Sunrise & Sunset',
                description: '',
                iconClass: 'fas fa-sun',
                iconColor: 'text-yellow-500',
                bgColor: 'bg-yellow-100 dark:bg-yellow-900/30'
            },
            {
                type: 'humidity',
                value: `${data.main.humidity}%`,
                label: 'Humidity',
                description: 'Normal',
                iconClass: 'fas fa-tint',
                iconColor: 'text-blue-500',
                bgColor: 'bg-blue-100 dark:bg-blue-900/30'
            },
            {
                type: 'visibility',
                value: `${(data.visibility / 1000).toFixed(1)} km`,
                label: 'Visibility',
                description: 'Average',
                iconClass: 'fas fa-eye',
                iconColor: 'text-green-500',
                bgColor: 'bg-green-100 dark:bg-green-900/30'
            },
            {
                type: 'airQuality',
                value: this.calculateAirQuality(data.main.temp),
                label: 'Air Quality',
                description: 'Unhealthy',
                iconClass: 'fas fa-leaf',
                iconColor: 'text-purple-500',
                bgColor: 'bg-purple-100 dark:bg-purple-900/30'
            },
            {
                type: 'pressure',
                value: `${data.main.pressure} hPa`,
                label: 'Pressure',
                description: 'Normal',
                iconClass: 'fas fa-thermometer-half',
                iconColor: 'text-indigo-500',
                bgColor: 'bg-indigo-100 dark:bg-indigo-900/30'
            }
        ];

        const mobileContainer = document.getElementById('mobileHighlights');
        const desktopContainer = document.getElementById('desktopHighlights');
        
        if (mobileContainer) mobileContainer.innerHTML = '';
        if (desktopContainer) desktopContainer.innerHTML = '';

        highlights.forEach(highlight => {
            if (mobileContainer) {
                const mobileCard = this.createHighlightCard(
                    highlight.type, highlight.value, highlight.label, 
                    highlight.description, highlight.iconClass, 
                    highlight.iconColor, highlight.bgColor
                );
                mobileContainer.appendChild(mobileCard);
            }

            if (desktopContainer) {
                const desktopCard = this.createHighlightCard(
                    highlight.type, highlight.value, highlight.label, 
                    highlight.description, highlight.iconClass, 
                    highlight.iconColor, highlight.bgColor
                );
                desktopContainer.appendChild(desktopCard);
            }
        });
    }

    calculateUVIndex(condition) {
        const uvMap = {
            'Clear': Math.floor(Math.random() * 3) + 7,
            'Clouds': Math.floor(Math.random() * 3) + 3,
            'Rain': Math.floor(Math.random() * 2) + 1,
            'Drizzle': Math.floor(Math.random() * 2) + 1,
            'Thunderstorm': Math.floor(Math.random() * 2) + 1,
            'Snow': Math.floor(Math.random() * 2) + 1,
            'Mist': Math.floor(Math.random() * 3) + 2,
            'Fog': Math.floor(Math.random() * 3) + 2
        };
        return uvMap[condition] || 3;
    }

    calculateAirQuality(temperature) {
        const baseAQI = Math.floor(Math.random() * 100) + 50;
        return Math.min(baseAQI, 200);
    }

    updateWeatherIcon(condition) {
        const iconElement = document.getElementById('weatherIcon');
        const iconData = this.getWeatherIconData(condition);
        
        iconElement.className = `${iconData.icon} text-6xl sm:text-8xl lg:text-7xl mb-4 sm:mb-6 lg:mb-4 opacity-90 ${iconData.color}`;
    }

    getWeatherIconData(condition) {
        const iconMap = {
            'Clear': { icon: 'fas fa-sun', color: 'text-yellow-400' },
            'Clouds': { icon: 'fas fa-cloud', color: 'text-gray-300' },
            'Rain': { icon: 'fas fa-cloud-rain', color: 'text-blue-400' },
            'Drizzle': { icon: 'fas fa-cloud-drizzle', color: 'text-blue-300' },
            'Thunderstorm': { icon: 'fas fa-bolt', color: 'text-purple-400' },
            'Snow': { icon: 'fas fa-snowflake', color: 'text-blue-100' },
            'Mist': { icon: 'fas fa-smog', color: 'text-gray-200' },
            'Fog': { icon: 'fas fa-smog', color: 'text-gray-200' }
        };
        
        return iconMap[condition] || { icon: 'fas fa-cloud', color: 'text-gray-300' };
    }

    // Forecast Functions
    processForecastData(forecastList) {
        const daily = {};
        
        forecastList.forEach(item => {
            const date = new Date(item.dt * 1000).toDateString();
            if (!daily[date]) {
                daily[date] = {
                    date: new Date(item.dt * 1000),
                    temps: [],
                    conditions: [],
                    humidities: [],
                    windSpeeds: [],
                    visibilities: [],
                    descriptions: [],
                    precipitations: []
                };
            }
            
            daily[date].temps.push(item.main.temp);
            daily[date].conditions.push(item.weather[0].main);
            daily[date].humidities.push(item.main.humidity);
            daily[date].windSpeeds.push(item.wind ? item.wind.speed : 0);
            daily[date].visibilities.push(item.visibility || 10000);
            daily[date].descriptions.push(item.weather[0].description);
            
            const rainChance = this.calculateRainChance(item.weather[0].main);
            daily[date].precipitations.push(rainChance);
        });
        
        return Object.values(daily).map(day => ({
            date: day.date,
            maxTemp: Math.round(Math.max(...day.temps)),
            minTemp: Math.round(Math.min(...day.temps)),
            condition: day.conditions[0],
            avgHumidity: Math.round(day.humidities.reduce((a, b) => a + b, 0) / day.humidities.length),
            avgWindSpeed: Math.round((day.windSpeeds.reduce((a, b) => a + b, 0) / day.windSpeeds.length) * 3.6),
            avgVisibility: Math.round((day.visibilities.reduce((a, b) => a + b, 0) / day.visibilities.length) / 1000),
            description: day.descriptions[0],
            rainChance: Math.round(day.precipitations.reduce((a, b) => a + b, 0) / day.precipitations.length)
        }));
    }

    calculateRainChance(condition) {
        const rainChances = {
            'Clear': 0, 'Clouds': 20, 'Rain': 80, 'Drizzle': 60,
            'Thunderstorm': 90, 'Snow': 70, 'Mist': 30, 'Fog': 25
        };
        return rainChances[condition] || 10;
    }

    createForecastCard(forecast, dayName) {
        const card = document.createElement('div');
        card.className = 'bg-white dark:bg-gray-800 rounded-xl lg:rounded-2xl p-4 sm:p-5 lg:p-6 shadow-sm dark:shadow-gray-700/20';
        
        const iconClass = this.getWeatherIconClass(forecast.condition);
        const iconColor = this.getIconColor(forecast.condition);
        
        card.innerHTML = `
            <div class="flex items-center justify-between mb-3 sm:mb-4">
                <div class="font-medium text-gray-800 dark:text-white text-base sm:text-lg">${dayName}</div>
                <div class="flex items-center space-x-3 sm:space-x-4">
                    <i class="${iconClass} text-xl sm:text-2xl ${iconColor}"></i>
                    <div class="text-right">
                        <div class="font-semibold text-gray-800 dark:text-white text-lg sm:text-xl">${forecast.maxTemp}° <span class="text-gray-500 dark:text-gray-400 font-normal">${forecast.minTemp}°</span></div>
                    </div>
                </div>
            </div>
            
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-200 dark:border-gray-600">
                <div class="flex items-center space-x-2">
                    <i class="fas fa-tint text-blue-500 text-xs sm:text-sm"></i>
                    <span class="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Humidity: <span class="font-medium">${forecast.avgHumidity}%</span></span>
                </div>
                <div class="flex items-center space-x-2">
                    <i class="fas fa-wind text-blue-500 text-xs sm:text-sm"></i>
                    <span class="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Wind: <span class="font-medium">${forecast.avgWindSpeed} km/h</span></span>
                </div>
                <div class="flex items-center space-x-2">
                    <i class="fas fa-eye text-green-500 text-xs sm:text-sm"></i>
                    <span class="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Visibility: <span class="font-medium">${forecast.avgVisibility} km</span></span>
                </div>
                <div class="flex items-center space-x-2">
                    <i class="fas fa-cloud-rain text-blue-500 text-xs sm:text-sm"></i>
                    <span class="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Rain: <span class="font-medium">${forecast.rainChance}%</span></span>
                </div>
            </div>
            
            <div class="mt-2 sm:mt-3">
                <p class="text-xs sm:text-sm text-gray-600 dark:text-gray-400 italic capitalize">${forecast.description}</p>
            </div>
        `;
        
        return card;
    }

    updateForecast(data) {
        const forecastContainer = document.getElementById('forecast');
        const dailyForecasts = this.processForecastData(data.list);
        
        forecastContainer.innerHTML = '';
        
        const today = new Date();
        const dayNames = [];
        
        for (let i = 0; i < 5; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            
            if (i === 0) {
                dayNames.push('Today');
            } else if (i === 1) {
                dayNames.push('Tomorrow');
            } else {
                dayNames.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
            }
        }
        
        dailyForecasts.slice(0, 5).forEach((forecast, index) => {
            const forecastCard = this.createForecastCard(forecast, dayNames[index]);
            forecastContainer.appendChild(forecastCard);
        });
    }

    getWeatherIconClass(condition) {
        const iconMap = {
            'Clear': 'fas fa-sun', 'Clouds': 'fas fa-cloud', 'Rain': 'fas fa-cloud-rain',
            'Drizzle': 'fas fa-cloud-drizzle', 'Thunderstorm': 'fas fa-bolt', 'Snow': 'fas fa-snowflake'
        };
        return iconMap[condition] || 'fas fa-cloud';
    }

    getIconColor(condition) {
        const colorMap = {
            'Clear': 'text-yellow-500', 'Clouds': 'text-gray-400', 'Rain': 'text-blue-500',
            'Drizzle': 'text-blue-400', 'Thunderstorm': 'text-purple-500', 'Snow': 'text-blue-200'
        };
        return colorMap[condition] || 'text-gray-400';
    }

    capitalizeFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }
}

// Initialize the weather app
document.addEventListener('DOMContentLoaded', () => {
    new WeatherApp();
});

// Configuración de TMDB
var TMDB_API_KEY = "ad301b7cc82ffe19273e55e4d4206885"; // Obtén tu API Key en https://www.themoviedb.org/settings/api
var TMDB_BASE_URL = "https://api.themoviedb.org/3";
var TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500";
var TMDB_BACKDROP_BASE = "https://image.tmdb.org/t/p/original";

// Handler principal
function TMDBHandler() {
    
    this.init = function() {
        TVXPluginTools.debug("TMDB Plugin: Inicializado");
    };
    
    this.ready = function() {
        TVXPluginTools.debug("TMDB Plugin: Listo");
    };
    
    this.handleRequest = function(dataId, data, callback) {
        TVXPluginTools.debug("TMDB Plugin: Procesando solicitud - " + dataId);
        
        var self = this;
        
        if (dataId === "popular") {
            self.fetchMovies("popular", callback);
        } else if (dataId === "now_playing") {
            self.fetchMovies("now_playing", callback);
        } else if (dataId === "top_rated") {
            self.fetchMovies("top_rated", callback);
        } else if (dataId === "upcoming") {
            self.fetchMovies("upcoming", callback);
        } else if (dataId === "search") {
            self.showSearchInput(callback);
        } else if (dataId.indexOf("search:") === 0) {
            var query = dataId.substring(7);
            self.searchMovies(query, callback);
        } else if (dataId.indexOf("movie:") === 0) {
            var movieId = dataId.substring(6);
            self.fetchMovieDetails(movieId, callback);
        } else {
            callback({
                "type": "list",
                "headline": "Error",
                "items": [{
                    "type": "default",
                    "layout": "0,0,2,4",
                    "title": "Solicitud no reconocida",
                    "titleFooter": dataId
                }]
            });
        }
    };
    
    this.fetchMovies = function(endpoint, callback) {
        var url = TMDB_BASE_URL + "/movie/" + endpoint + 
                  "?api_key=" + TMDB_API_KEY + 
                  "&language=es-ES&page=1";
        
        TVXPluginTools.debug("Obteniendo películas desde: " + url);
        
        this.makeRequest(url, function(response) {
            if (response && response.results) {
                var content = {
                    "type": "list",
                    "headline": getTitleForEndpoint(endpoint),
                    "template": {
                        "type": "separate",
                        "layout": "0,0,2,4",
                        "icon": "msx-white-soft:movie",
                        "color": "msx-glass"
                    },
                    "items": []
                };
                
                for (var i = 0; i < response.results.length; i++) {
                    var movie = response.results[i];
                    content.items.push(createMovieItem(movie));
                }
                
                callback(content);
            } else {
                callback(createErrorContent("No se pudieron cargar las películas"));
            }
        });
    };
    
    this.searchMovies = function(query, callback) {
        var url = TMDB_BASE_URL + "/search/movie" +
                  "?api_key=" + TMDB_API_KEY +
                  "&language=es-ES&query=" + encodeURIComponent(query) +
                  "&page=1";
        
        this.makeRequest(url, function(response) {
            if (response && response.results) {
                var content = {
                    "type": "list",
                    "headline": "Resultados: " + query,
                    "template": {
                        "type": "separate",
                        "layout": "0,0,2,4",
                        "icon": "msx-white-soft:movie",
                        "color": "msx-glass"
                    },
                    "items": []
                };
                
                if (response.results.length === 0) {
                    content.items.push({
                        "type": "default",
                        "layout": "0,0,2,4",
                        "title": "Sin resultados",
                        "titleFooter": "Intenta con otro término de búsqueda"
                    });
                } else {
                    for (var i = 0; i < response.results.length; i++) {
                        var movie = response.results[i];
                        content.items.push(createMovieItem(movie));
                    }
                }
                
                callback(content);
            } else {
                callback(createErrorContent("Error en la búsqueda"));
            }
        });
    };
    
    this.showSearchInput = function(callback) {
        callback({
            "type": "list",
            "headline": "Buscar Películas",
            "template": {
                "type": "button",
                "layout": "0,0,2,1"
            },
            "items": [{
                "title": "Buscar...",
                "icon": "search",
                "action": "input:request:interaction:search:{INPUT}"
            }]
        });
    };
    
    this.fetchMovieDetails = function(movieId, callback) {
        var url = TMDB_BASE_URL + "/movie/" + movieId +
                  "?api_key=" + TMDB_API_KEY +
                  "&language=es-ES&append_to_response=videos";
        
        this.makeRequest(url, function(response) {
            if (response) {
                var content = {
                    "type": "pages",
                    "headline": response.title,
                    "pages": [{
                        "items": []
                    }]
                };
                
                // Información principal
                content.pages[0].items.push({
                    "type": "default",
                    "layout": "0,0,6,4",
                    "image": TMDB_IMAGE_BASE + response.poster_path,
                    "title": response.title,
                    "titleFooter": "Fecha: " + response.release_date + " | ⭐ " + response.vote_average,
                    "text": response.overview
                });
                
                // Videos/Trailers
                if (response.videos && response.videos.results.length > 0) {
                    var trailer = response.videos.results[0];
                    if (trailer.site === "YouTube") {
                        content.pages[0].items.push({
                            "type": "default",
                            "layout": "0,4,6,2",
                            "title": "Ver Tráiler",
                            "icon": "play-circle-outline",
                            "action": "video:plugin:https://www.youtube.com/watch?v=" + trailer.key
                        });
                    }
                }
                
                callback(content);
            } else {
                callback(createErrorContent("No se pudieron cargar los detalles"));
            }
        });
    };
    
    this.makeRequest = function(url, successCallback) {
        TVXPluginTools.ajax({
            url: url,
            type: "GET",
            dataType: "json",
            success: function(response) {
                successCallback(response);
            },
            error: function(xhr, status, error) {
                TVXPluginTools.debug("Error en la petición: " + error);
                successCallback(null);
            }
        });
    };
}

// Funciones auxiliares
function getTitleForEndpoint(endpoint) {
    var titles = {
        "popular": "Películas Populares",
        "now_playing": "En Cartelera",
        "top_rated": "Mejor Valoradas",
        "upcoming": "Próximos Estrenos"
    };
    return titles[endpoint] || "Películas";
}

function createMovieItem(movie) {
    var rating = movie.vote_average ? "⭐ " + movie.vote_average.toFixed(1) : "Sin valoración";
    var year = movie.release_date ? " (" + movie.release_date.substring(0, 4) + ")" : "";
    
    return {
        "title": movie.title + year,
        "titleFooter": rating,
        "image": movie.poster_path ? TMDB_IMAGE_BASE + movie.poster_path : "",
        "imageFiller": "cover",
        "action": "content:request:interaction:movie:" + movie.id + "@http://hueso01.github.io/msx/tmdb-plugin.html",
        "properties": {
            "button:content:icon": "info-outline",
            "button:content:label": "Ver detalles"
        }
    };
}

function createErrorContent(message) {
    return {
        "type": "list",
        "headline": "Error",
        "items": [{
            "type": "default",
            "layout": "0,0,2,4",
            "title": message,
            "icon": "error"
        }]
    };
}

// Inicialización
TVXPluginTools.onReady(function() {
    TVXInteractionPlugin.setupHandler(new TMDBHandler());
    TVXInteractionPlugin.init();
});


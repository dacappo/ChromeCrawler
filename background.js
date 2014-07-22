//(function() {
	var database;
	var settings;
	var currentTopLevelIndex = 1;
	var crawlerTabs = [];

	function initializeCrawler() {
		getSettings();
		initializeDatabase();
	}

	function getSettings() {
		var xhr = new XMLHttpRequest();
		var src = chrome.extension.getURL("config.json");
		xhr.open("GET", src, false);
		xhr.send();

		settings = JSON.parse(xhr.responseText);
	}


	function initializeDatabase() {

		var request;

		indexedDB.deleteDatabase("alexa");
		request = indexedDB.open("alexa", 1);

		request.onerror = function() {
			console.log("Database creation failed!");
		};

		request.onupgradeneeded = function() {

			var database = this.result;
			if (!database.objectStoreNames.contains("urls")) {
				var store = database.createObjectStore("urls", {keyPath: "url"});
				store.createIndex("rank", "rank", {unique: false});
				store.createIndex("next", ["origin", "crawled", "level"], {unique: false});

			}
		};

		request.onsuccess = function() {
			console.log("Database opened");

			database = this.result;

			var trans = database.transaction(["urls"], 'readwrite');
			var store = trans.objectStore("urls");

			getUrls().forEach(function(alexaEntity) {
				var entity = new UrlEntity(alexaEntity.url, undefined, 0);
				entity.rank = alexaEntity.id;
				storeUrlEntity(entity);
				});
		};
	}


	function storeUrlEntity(urlEntity) {
		if (urlEntity.level <= settings.levelLimit) {
			var trans = database.transaction(["urls"], 'readwrite');
			var store = trans.objectStore("urls");
			var addRequest = store.add(urlEntity);

			addRequest.onerror = function(error) {
				// Handle constraint error -> Just do nothing, datasets should not be overwritten
				//console.info(JSON.stringify(error));
			};

			addRequest.onsuccess = function(event) {
				if(addRequest.result) {
					console.log("Entry " + JSON.stringify(urlEntity) + " stored");
					
				}
			};
		}
	}

	function getUrls(){
		var xhr = new XMLHttpRequest();
		var src = chrome.extension.getURL("alexa5.json");
		xhr.open("GET", src, false);
		xhr.send();

		var result = JSON.parse(xhr.responseText);
		console.log("JSON parsed");
		return result;
	}


	/**** Crawling logic ****/

	function CrawlerTab() {
		var urlEntity, chromeTab, intervall;

		this.start = function() {
			run();
		}		

		this.stop = function(){
			clearInterval(intervall); 
		}

		this.getUrlEntity = function() {
			return urlEntity;
		}

		this.getTab = function() {
			return chromeTab;
		}
		
		function setTab(newTab) {
			chromeTab = newTab;
			run();
		}

		function setUrlEntity(newUrlEntity) {
			console.log("READ: " + JSON.stringify(newUrlEntity));
			urlEntity = newUrlEntity;
			update();
			setUrlEntityCrawled(newUrlEntity);
		}


		function update() {
			chrome.tabs.update(chromeTab.id, {"url" : urlEntity.url});
		}

		function next() {
			getNextUrlEntity(urlEntity, setUrlEntity);

		}

		function run(){
			intervall = setInterval(next, settings.timePerPage); 
		}

		chrome.tabs.create({}, setTab);
		crawlerTabs.push(this);
	}

	function setUrlEntityCrawled(urlEntity) {
		if (urlEntity) {
			/*database.transaction(["urls"], 'readwrite').objectStore("urls").delete(urlEntity.url).onsuccess = function() {
				urlEntity.crawled = 1;
				database.transaction(["urls"], 'readwrite').objectStore("urls").add(urlEntity).onsuccess = function() {
					console.log(urlEntity.url + " crawling!");			
				};
			};*/
		}
	}

	function getNextUrlEntity(currentUrlEntity, callback) {

		if (currentUrlEntity) {
			getNextUrlOfOrigin(currentUrlEntity.origin, settings.levelLimit ,callback);
		} else {
			getNextTopLevelUrl(callback);
		}

	}

	function getNextTopLevelUrl(callback) {
		var trans = database.transaction(["urls"], 'readwrite');
		var store = trans.objectStore("urls");
		var index = store.index("rank");
		var request = index.get(currentTopLevelIndex);
		request.onsuccess = function(event) {
			var cursor = event.target.result;
			if(cursor) {
				callback(event.target.result);
			} else {
				currentTopLevelIndex++;
				getNextTopLevelUrl(callback);
			}
		}
		currentTopLevelIndex++;
	}

	function getNextUrlOfOrigin(origin, level, callback) {

		if (level === 0) {
			getNextTopLevelUrl(callback);
		} else if (level > 0) {
			var trans = database.transaction(["urls"], 'readwrite');
			var store = trans.objectStore("urls");
			var index = store.index("next");
			var request = index.get([origin, 0, level]);
			request.onsuccess = function(event) {
				var cursor = request.result;
				if(cursor) {
					callback(request.result);
				} else {
					getNextUrlOfOrigin(origin, (level-1), callback);
				}
			}
		}

	}

	function runCrawler() {

		// Open crawling tabs
		for (var i = 0; i < settings.numberOfTabs; i++) {
			new CrawlerTab();
		}		
	}

	

	function getOriginOfUrl(url) {
		pathArray = url.split("/");
		return pathArray[0] + "//" + pathArray[2];
	}

	function getNextLevel(tabID) {
		for (var i = 0; i < crawlerTabs.length; i++) {
			if(crawlerTabs[i].getTab().id === tabID) {
				return crawlerTabs[i].getUrlEntity().level + 1;
			}
		}

		return settings.levelLimit;
	}

	function UrlEntity(url, parentUrl, level) {
		this.url = url;
		this.parentUrl = parentUrl;
		this. origin = getOriginOfUrl(url);
		this.level = level;
		this.crawled = 0;
	}

	
	/* Message event handler for communication with content scripts */
	chrome.runtime.onMessage.addListener(
		function(message, sender) {
			storeUrlEntity(new UrlEntity(message.url, message.parentUrl, getNextLevel(sender.tab.id)));
		}
	);

	chrome.browserAction.onClicked.addListener(function() {
		runCrawler();
	});

	initializeCrawler();

//}());
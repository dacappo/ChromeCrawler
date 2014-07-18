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
			var getRequest = store.get(urlEntity.url);

			getRequest.onerror = function(event) {
				console.log("Error!");
			};

			getRequest.onsuccess = function(event) {
				if(!getRequest.result) {

					var putRequest = store.put(urlEntity);

					putRequest.onerror = function(event) {
						console.log("Error!");
					};

					putRequest.onsuccess = function(evt) {
						console.log("Entry " + JSON.stringify(evt.target.result) + " stored");
					};
				}
			};
		}
	}

	function getUrls(){
		var xhr = new XMLHttpRequest();
		var src = chrome.extension.getURL("alexa.json");
		xhr.open("GET", src, false);
		xhr.send();

		var result = JSON.parse(xhr.responseText);
		console.log("JSON parsed");
		return result;
	}


	/**** Crawling logic ****/

	function getNetxtUrlEntity() {
		var trans = database.transaction(["urls"], 'readwrite');
		var store = trans.objectStore("urls");

		

		return {"url": getNextTopLevelUrl() , "level" : 0};
	}

	function getNextTopLevelUrl() {
		var trans = database.transaction(["urls"], 'readwrite');
		var store = trans.objectStore("urls");
		var index = store.index("rank");
		var request = index.get(currentTopLevelIndex);
		request.onsuccess = function(event) {
			var cursor = event.target.result;
			if(cursor) {
				console.log(event.target.result);
			}
		}
		currentTopLevelIndex++;
	}

	function runCrawler() {

		var url;

		/* Close all open tabs */
		chrome.tabs.query({}, function(tabs) {
			for (var i = 0; i < tabs.length; i++) {
				chrome.tabs.remove(tabs[i].id);
			}
		});

		/* Open crawling tabs */
		for (var i = 0; i < settings.numberOfTabs; i++) {
			urlEntity = getNetxtUrlEntity();
			chrome.tabs.create({"url": urlEntity.url}, function(tab) {
				crawlerTabs.push({"openedUrlEntity" : urlEntity, "tab" : tab})});
		}

		setInterval(function() {reloadTabs();}, (settings.timePerPage * 1000));
		
	}

	function reloadTabs() {
		/* Set reload intervall for tabs */
		for (var i = 0; i < crawlerTabs.length; i++) {
			chrome.tabs.update(crawlerTabs[i].tab.id, {"url" : getNetxtUrlEntity().url});
		}
	}

	function getOriginOfUrl(url) {
		pathArray = url.split("/");
		return pathArray[0] + "//" + pathArray[2];
	}

	function getNextLevel(tabID) {
		for (var i = 0; i < crawlerTabs.length; i++) {
			//console.log(crawlerTabs[i].tab.id + " - " + tabID)
			if(crawlerTabs[i].tab.id == tabID) {
				//console.log(crawlerTabs[i].openedUrlEntity.level);
				return crawlerTabs[i].openedUrlEntity.level + 1;
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
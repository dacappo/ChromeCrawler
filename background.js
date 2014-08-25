(function() {
	"use strict";

	var settings = getSettings();
	var dataModel = new DataModel();

	function getSettings() {
		var xhr = new XMLHttpRequest();
		var src = chrome.extension.getURL("config.json");
		xhr.open("GET", src, false);
		xhr.send();

		return JSON.parse(xhr.responseText);
	} 

	function DataModel() {

		var urlList = [];
		var currentTopLevelIndex = 0;
		var currentUrlIndex = 0;

		function checkIfAlreadyPresent(urlEntity) {
			for (var i = 0; i < urlList[urlEntity.level].length; i++) {
				if (urlList[urlEntity.level][i].url === urlEntity.url) {
					return true;
				}
			}

			return false;
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

		

		function setUrlEntityCrawled (urlEntity) {
			if (!urlEntity) return true;
			for (var i = 0; i < urlList[urlEntity.level].length; i++) { 
				if (urlList[urlEntity.level][i].url === urlEntity.url) {
					urlList[urlEntity.level][i].crawled = true;
					return true;
				};
			}

			return false;
		}

		function getNextUrlEntity (currentUrlEntity) {
			currentUrlIndex++;
			if (currentUrlEntity) {
				return getNextUrlOfOrigin(currentUrlEntity, settings.levelLimit);
			} else {
				return getNextTopLevelUrl(currentUrlEntity);
			}
			
		}

		function getNextUrlOfOrigin(currentUrlEntity, level) {
			if (level === 0) {
				return getNextTopLevelUrl(currentUrlEntity);
			} else {
				for (var i = 0; i < urlList[level].length; i++) {
					if(!urlList[level][i].crawled && urlList[level][i].origin === currentUrlEntity.origin) {
						return urlList[level][i];
					}
				}

				return getNextUrlOfOrigin(currentUrlEntity, (level-1));
			}
		}

		function getNextTopLevelUrl(currentUrlEntity) {
			deleteUrlsFromOrigin(currentUrlEntity);
			var result =  urlList[0][currentTopLevelIndex];
			currentTopLevelIndex++;
			console.log("Crawling TLD " + currentTopLevelIndex + " - " + currentUrlIndex + " " + JSON.stringify(result));
			return result;
		}

		function deleteUrlsFromOrigin(urlEntity) {
			for (var i = 1; i < urlList.length; i++) {
				for (var j = 0; i <= urlList[i]; j++) {
					if (urlList[i][j].origin === urlEntity.origin) {
						urlList[i].splice(j, 1);
					}
				}
			}
		}

		function storeUrlEntity(urlEntity) {
			if (urlEntity.level <= settings.levelLimit && !checkIfAlreadyPresent(urlEntity)) {
				urlList[urlEntity.level].push(urlEntity);
				//console.log("UrlEntity " + JSON.stringify(urlEntity) + " stored");
			}
		}

		function setStartIndex(i) {
			currentTopLevelIndex = i;
		}

		function initialize() {
			// Top level url list
			urlList = [];
			// Other level url lists
			for (var i = 0; i <= settings.levelLimit; i++) {
				urlList.push(new Array());
			}

			// Fill first level url list
			getUrls().forEach(function(url) {storeUrlEntity(new UrlEntity(url.url, undefined, 0));});

			// Set start index
			setStartIndex(settings.startIndex - 1);
		}

		

		this.storeUrlEntity = storeUrlEntity;
		this.setUrlEntityCrawled = setUrlEntityCrawled;
		this.getNextUrlEntity = getNextUrlEntity;

		initialize();
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
			urlEntity = newUrlEntity;
			if (!urlEntity) {
				stop();
			} else {
				update();
			}
		}

		function update() {
			//console.info("Crawling: " + JSON.stringify(urlEntity));
			chrome.tabs.update(chromeTab.id, {"url" : urlEntity.url});
		}

		function next() {
			dataModel.setUrlEntityCrawled(urlEntity);
			setUrlEntity(dataModel.getNextUrlEntity(urlEntity));
		}

		function run(){
			intervall = setInterval(next, settings.timePerPage); 
		}

		chrome.tabs.create({}, setTab);
	}
	

	function UrlEntity(url, parentUrl, level) {
		this.url = url;
		this.parentUrl = parentUrl;
		this.origin = getHostnameOfUrl(url);
		this.level = level;
		this.crawled = false;

		function getHostnameOfUrl(url) {
			var pathArray = url.split("/");
			return pathArray[2];
		}
	}

	function Crawler() {

		var crawlerTabs = [];

		function getNextLevel(tabID) {
			for (var i = 0; i < crawlerTabs.length; i++) {
				if(crawlerTabs[i].getTab().id === tabID) {
					return crawlerTabs[i].getUrlEntity().level + 1;
				}
			}

			return settings.levelLimit;
		}

		function runCrawler() {
			var spread = settings.timePerPage / settings.numberOfTabs;
			// Open crawling tabs
			for (var i = 0; i < settings.numberOfTabs; i++) {
				setTimeout(function() {
					var tab = new CrawlerTab();
					crawlerTabs.push(tab);
				}, i*spread);
			}		
		}

		function initialize() {
			/* Message event handler for communication with content scripts */
			chrome.runtime.onMessage.addListener(
				function(message, sender) {
					dataModel.storeUrlEntity(new UrlEntity(message.url, message.parentUrl, getNextLevel(sender.tab.id)));
				}
			);

			/* Event listener on cralwer icon */
			chrome.browserAction.onClicked.addListener(function() {
				runCrawler();
			});
		}

		initialize();
	}

	window.crawler = new Crawler();

}());
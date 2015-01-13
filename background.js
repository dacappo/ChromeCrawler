(function() {
	"use strict";

	var settings = getSettings();
	var persistence = new Persistence();

	function getSettings() {
		var xhr = new XMLHttpRequest();
		var src = chrome.extension.getURL("config.json");
		xhr.open("GET", src, false);
		xhr.send();

		return JSON.parse(xhr.responseText);
	}

	document.write('<script src="URI.js"></script>');


	function serializeForRequest(obj, key) {
		return key + "=" + encodeURIComponent(JSON.stringify(obj));
	}
	

	/**** Crawling logic ****/

	function Persistence() {

		this.setSuccessfullyCrawled = function(urlEntity) {
			var xhr = new XMLHttpRequest();
			var src = "http://" + settings.server.host + ":" + settings.server.port + "/Server/setSuccessfullyCrawled.php";
			var data = serializeForRequest(urlEntity.Id, "Id");

			xhr.onreadystatechange = function() {
				if (xhr.readyState==4 && xhr.status==200) {
					//console.log("DB: Url succesfully crawled!");
				}
			};

			xhr.open("POST", src, true);
			xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
			xhr.send(data);
		};

		this.storeCollectedUrls = function(UrlSet, callback) {
			var xhr = new XMLHttpRequest();
			var src = "http://" + settings.server.host + ":" + settings.server.port + "/Server/setCollectedUrls.php";
			var data = serializeForRequest(UrlSet, "urlEntities");

			xhr.onreadystatechange = function() {
				
				if (xhr.readyState==4 && xhr.status==200) {
					//console.log("DB: Collected urls stored!");
					callback();
				}
			};

			xhr.open("POST", src, true);
			xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
			xhr.send(data);
		};

		this.getNextUrl = function(domain, callback) {

			var xhr = new XMLHttpRequest();
			var src = "http://" + settings.server.host + ":" + settings.server.port + "/Server/getNextUrl.php";
			var data = "";
			if (domain) data = serializeForRequest(domain, "domain");

			xhr.onreadystatechange = function() {
				if (xhr.readyState==4 && xhr.status==200) {
					//console.log("DB: Selected new url!");
					callback(JSON.parse(xhr.responseText));
				}
			};

			xhr.open("POST", src, true);
			xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
			xhr.send(data);
		};
	}

	function CrawlerTab() {
		var currentUrlEntity, chromeTab, nextTimeout;

		this.setSuccessfullyCrawled = function() {
			persistence.setSuccessfullyCrawled(currentUrlEntity);	
		};

		this.stop = function(){
			clearInterval(nextTimeout); 
		};

		this.getUrlEntity = function() {
			return currentUrlEntity;
		};

		this.getChromeTab = function() {
			return chromeTab;
		};

		this.pause = pause;
		this.resume = resume;
		this.next = next;
		this.storeCollectedUrls = storeCollectedUrls;
		
		

		function pause() {
			chrome.tabs.remove(chromeTab.id);
			if (nextTimeout) clearInterval(nextTimeout);
		}

		function resume() {
			chrome.tabs.create({}, start);
		}

		function start(newTab) {
			chromeTab = newTab;
			next();
		}

		function setUrlEntity(newUrlEntity) {
			currentUrlEntity = newUrlEntity;
			if (!currentUrlEntity) stop();
		}

		function update(urlEntity) {
			setUrlEntity(urlEntity);
			resetTimeout();
			chrome.tabs.update(chromeTab.id, {"url" : currentUrlEntity.Url});
		}

		function next() {
			if (currentUrlEntity) {
				persistence.getNextUrl(currentUrlEntity.Domain, update);
			} else {
				persistence.getNextUrl(undefined, update);
			}

		}

		function resetTimeout(){
			if (nextTimeout) clearInterval(nextTimeout);
			nextTimeout = setInterval(next, settings.timeout); 
		}

		function storeCollectedUrls(urlSet) {
			persistence.storeCollectedUrls(urlSet, next);
		}

		//chrome.tabs.create({}, start);
	}

	function Crawler() {

		var isRunning = false;
		var crawlerTabs = [];

		function addTab() {
			crawlerTabs.push(new CrawlerTab());
		}

		function run() {
			isRunning = true;
			//var addTab = function() {crawlerTabs.push(new CrawlerTab());};
			// Open crawling tabs
			while (crawlerTabs.length < settings.numberOfTabs) {
				addTab();
			}

			crawlerTabs.forEach(function(crawlerTab) {
				crawlerTab.resume();
			});
		}

		function pause() {
			isRunning = false;
			crawlerTabs.forEach(function (crawlerTab) {
				crawlerTab.pause();				
			});
		}

		function getTab(id) {
			for (var i = 0; i < crawlerTabs.length; i++) {
				if (crawlerTabs[i].getChromeTab().id === id) {
					return crawlerTabs[i];
				}
			}
		}

		function initialize() {
			/* Message event handler for communication with content scripts */
			chrome.runtime.onMessage.addListener(
				function(message, sender) {
					var urlSet = [];
					message.forEach(function(ms) {
						ms.level = parseInt(getTab(sender.tab.id).getUrlEntity().Level) + 1;
						var uri = new URI(ms.url);
						ms.domain = uri.domain();

						if (ms.level <= settings.levelLimit) urlSet.push(ms); 
					});
					getTab(sender.tab.id).storeCollectedUrls(urlSet);
					getTab(sender.tab.id).setSuccessfullyCrawled();
				}
			);

			/* Event listener on cralwer icon */
			chrome.browserAction.onClicked.addListener(function() {
				if (!isRunning) {
					run();
				} else {
					pause();
				}
			});
		}

		initialize();
	}
	
	window.crawler = new Crawler();

}());
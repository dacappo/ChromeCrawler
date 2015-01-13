(function() {
	var settings = getSettings();

	function getSettings() {
		var xhr = new XMLHttpRequest();
		var src = chrome.extension.getURL("config.json");
		xhr.open("GET", src, false);
		xhr.send();

		return JSON.parse(xhr.responseText);
	}

	function reportUrls(urlSet) {
		//console.log("Total of " + urlSet.length + " Urls reported!");
		chrome.runtime.sendMessage(urlSet);
	}

	function getHostnameOfUrl(url) {
		var pathArray = url.split("/");
		return pathArray[2];
	}

	function hostnameMatches(url) {
		if (getHostnameOfUrl(location.href) === getHostnameOfUrl(url)) {
			return true;
		} else {
			return false;
		}
	}

	document.addEventListener("DOMContentLoaded", function(event) {
		var anchorTags = document.getElementsByTagName("a");
		var i, url, urlSet = [];

		// Loop through all anchor tags within the website
		for (i = 0; i < anchorTags.length; i++) {
			//Check if href attribute exists
			if (anchorTags[i].getAttribute("href")) {
				// IMPORTANT! no getAttribute -> probably not the full url
				url = anchorTags[i].href;
				// Check if absolute url - refactored
				if (url && hostnameMatches(url)) {
					urlSet.push({"url": url});
				}
			}
		}
		reportUrls(urlSet);
	});

}());
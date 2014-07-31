(function() {
	// store origin in case of an redirect
	var href = location.href;
	var settings;

	(function getSettings() {
		var xhr = new XMLHttpRequest();
		var src = chrome.extension.getURL("config.json");
		xhr.open("GET", src, false);
		xhr.send();

		settings = JSON.parse(xhr.responseText);
	}());

	function reportUrl(url) {
		console.log(url);
		chrome.runtime.sendMessage(url);
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
		var i, url;

		// Loop through all anchor tags within the website
		for (i = 0; i < anchorTags.length; i++) {
			//Check if href attribute exists
			if (anchorTags[i].getAttribute("href")) {
				// IMPORTANT! no getAttribute -> probably not the full url
				url = anchorTags[i].href;
				// Check if absolute url be refactored
				if (url && hostnameMatches(url)) {
					reportUrl({"url": url, "parentUrl" : href});
				}
			}
		}
	});

}());
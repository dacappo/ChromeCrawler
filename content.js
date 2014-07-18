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

	function refactorUrl(url) {
		if (url.substring(0, 7) === "http://" || url.substring(0, 8) === "https://") {
			// for absolute urls
			return url;
		} else if (url.substring(0, 1) === "/") {
			// for relative urls
			return location.origin + url;
		} else {
			return undefined;
		}
	}

	

	document.addEventListener("DOMContentLoaded", function(event) {
		var anchorTags = document.getElementsByTagName("a");
		var i, url;

		// Loop through all anchor tags within the website
		for (i = 0; i < anchorTags.length; i++) {
			//Check if href attribute exists
			if (anchorTags[i].getAttribute("href")) {
				url = refactorUrl(anchorTags[i].getAttribute("href"));
				// Check if absolute url be refactored
				if (url) {
					reportUrl({"url": url, "parentUrl" : href});
				}
			}
		}
	});

}());
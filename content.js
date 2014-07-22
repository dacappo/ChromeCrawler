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

	
	function getOriginOfUrl(url) {
		pathArray = url.split("/");
		return pathArray[0] + "//" + pathArray[2];
	}

	function originMatches(url) {
		if (getOriginOfUrl(location.href) === getOriginOfUrl(url)) {
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
				if (url && originMatches(url)) {
					reportUrl({"url": url, "parentUrl" : href});
				}
			}
		}
	});

}());
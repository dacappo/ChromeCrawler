<?php
header('Content-Type: application/json');

include("database.php");
include("log.php");

if(isset($_POST["domain"])) {
	$urlEntity = getNextUrl(json_decode($_POST["domain"]));
} else {
	$urlEntity = getNextTopLevelUrl();	
}

sendUrlBack($urlEntity);


function getNextUrl($domain) {
	
	$dbh = connectToDatabase("localhost", "crawler","crawler","Crawler");
	$stmtGetUrl = $dbh->prepare('SELECT * FROM Crawler.Urls WHERE Crawled = FALSE AND Domain = :domain ORDER BY Level ASC LIMIT 1;');
	$stmtGetUrl->bindParam(':domain', $domain);

	if ($results = $stmtGetUrl->execute()){
   		logMessage("Query ran successfully: " . $stmtGetUrl->queryString);
	} else {
    	logMessage("Error running query: " . array_pop($stmtGetUrl->errorInfo()) . " : " . $stmtGetUrl->queryString);
    	return;
	}
	
	if (!($result = $stmtGetUrl->fetch())) $result = getNextTopLevelUrl(); 

	return $result;
}

function getNextTopLevelUrl() {
	$dbh = connectToDatabase("localhost", "crawler","crawler","Crawler");
	$stmtGetUrl = $dbh->prepare('SELECT * FROM Crawler.Urls WHERE Crawled = FALSE AND Level = 0 LIMIT 1;');

	if ($results = $stmtGetUrl->execute()){
   		logMessage("Query ran successfully: " . $stmtGetUrl->queryString);
	} else {
    	logMessage("Error running query: " . array_pop($stmtGetUrl->errorInfo()) . " : " . $stmtGetUrl->queryString);
    	return;
	}

	if(!($result = $stmtGetUrl->fetch())) $result = ["Url" => "about:blank", "Level" => 1000];

	return $result;
}

function sendUrlBack($urlEntity) {
	setCrawled($urlEntity);
	echo json_encode($urlEntity);
}

function setCrawled($urlEntity) {
	if ($urlEntity["Url"] == "about:blank") return;
	$dbh = connectToDatabase("localhost", "crawler","crawler","Crawler");
	$stmtSetUrlCrawled = $dbh->prepare('UPDATE Crawler.Urls SET Crawled = TRUE WHERE Id = :id');
	$stmtSetUrlCrawled->bindParam(':id', $urlEntity["Id"]);

	if ($results = $stmtSetUrlCrawled->execute()){
   		logMessage("Query ran successfully: " . $stmtSetUrlCrawled->queryString);
	} else {
    	logMessage("Error running query: " . array_pop($stmtSetUrlCrawled->errorInfo()) . " : " . $stmtSetUrlCrawled->queryString);
    	return;
	}
}

<?php
header('Content-Type: application/json');

include("database.php");
include("log.php");

function storeUrlEntities($urlEntities) {
	$dbh = connectToDatabase("localhost", "crawler", "crawler","Crawler");
	$stmtStoreUrl = $dbh->prepare('INSERT INTO Crawler.Urls (Url, UrlHash, Domain, Level, Crawled, Successful) VALUES (:url, SHA1(:url), :domain, :level, FALSE, FALSE);');
	$stmtStoreUrl->bindParam(':url', $urlEntityUrl);
	$stmtStoreUrl->bindParam(':domain', $urlEntityDomain);
	$stmtStoreUrl->bindParam(':level', $urlEntityLevel);

	foreach($urlEntities AS $urlEntity) {
		
		$urlEntityUrl = $urlEntity->url;
		$urlEntityDomain = $urlEntity->domain;
		$urlEntityLevel = $urlEntity->level;

		if ($results = $stmtStoreUrl->execute()){
	   		logMessage("Query ran successfully: " . $stmtStoreUrl->queryString);
		} else {
	    	logMessage("Error running query: " . array_pop($stmtStoreUrl->errorInfo()) . " : " . $stmtStoreUrl->queryString);
		}
	}
}

if(!(isset($_POST["urlEntities"]))) return;
storeUrlEntities(json_decode($_POST["urlEntities"]));
echo json_encode(["Successful" => TRUE]);

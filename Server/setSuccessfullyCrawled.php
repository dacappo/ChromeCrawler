<?php

header('Content-Type: application/json');

include("database.php");
include("log.php");

function setUrlSuccesfullyCrawled($urlId) {
	$dbh = connectToDatabase("localhost", "crawler", "crawler","Crawler");
	$stmtStoreUrl = $dbh->prepare('UPDATE Crawler.Urls SET Successful = TRUE WHERE Id = :id');
	$stmtStoreUrl->bindParam(':id', $urlId);


	if ($results = $stmtStoreUrl->execute()){
		logMessage("Query ran successfully: " . $stmtStoreUrl->queryString);
	} else {
		logMessage("Error running query: " . array_pop($stmtStoreUrl->errorInfo()) . " : " . $stmtStoreUrl->queryString);
	}
}

if(!(isset($_POST["Id"]))) return;
setUrlSuccesfullyCrawled(json_decode($_POST["Id"]));
echo json_encode(["Successful" => TRUE]);
<?php

putenv("LOG=FALSEE");

function logMessage($message) {
//	if(getenv("LOG")) file_put_contents("log.txt", $message . "\n", FILE_APPEND | LOCK_EX);
}

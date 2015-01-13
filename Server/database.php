<?php

function connectToDatabase($server, $user, $password, $database) {
    $dsn = 'mysql:dbname=' . $database . ';host=' . $server;
    try {
        $dbh = new PDO($dsn, $user, $password);
    } catch (PDOException $e) {
        echo 'Connection failed: ' . $e->getMessage();
        $dbh = false;
    }
    return $dbh;
}
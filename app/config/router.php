<?php

$router = $di->getRouter();
$router->removeExtraSlashes(true);
// Define your routes here

$router->addGet('/songs/([\d]+)$',[
  'controller' => 'playlist',
  'action'     => 'info',
  'id' => 1
]);

$router->addGet('/songs', [
  'controller' => 'playlist',
  'action' => 'index'
]);

$router->addGet('/songs/update', [
  'controller'=> 'playlist',
  'action'=>'update'
]);

$router->addGet('/songs/list', [
  'controller'=> 'playlist',
  'action'=>'list'
]);

$router->addPut('/songs/([\d]+)$', [
  'controller' => 'playlist',
  'action'     => 'updateSong',
  'id' => 1
]);

$router->addPut('/song/([\d]+)/like', [
  'controller' => 'playlist',
  'action'     => 'likeSong',
  'id' => 1
]);

$router->addPut('/song/([\d]+)/lyrics$', [
  'controller' => 'playlist',
  'action'     => 'getLyrics',
  'id' => 1
]);

$router->addDelete('/song/([\d]+)$', [
  'controller' => 'playlist',
  'action'     => 'deleteSong',
  'id' => 1
]);

$router->addGet('/song/([\d]+).mp3$', [
  'controller' => 'playlist',
  'action'     => 'file',
  'id' => 1
]);

$router->addGet('/song/end/([\d]+)$', [
  'controller' => 'playlist',
  'action'     => 'count',
  'id' => 1
]);

$router->handle();

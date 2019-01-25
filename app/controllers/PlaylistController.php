<?php

class PlaylistController extends ControllerBase {
  public function indexAction() {
    $songs_dir = $this->config->application->musicFolder;
    $this->view->songs_dir = $songs_dir;
  }

  public function infoAction($id) {
    $song_data = array("tags"=>array());
    $infoSong = Songs::findFirst($id);
    $infoSong->like = $infoSong->like == '1';
    sscanf($infoSong->duration, "%d:%d:%d", $hours, $minutes, $seconds);
    $time_seconds = isset($seconds) ? $hours * 3600 + $minutes * 60 + $seconds : $hours * 60 + $minutes;

    $infoSong->duration  = $time_seconds;
    $infoSong->file_path = realpath($infoSong->file_path);

    $tags_query = $this->modelsManager->createQuery("SELECT DISTINCT substring_index(substring_index(s.tags, ',', a.id), ',', -1) as tag FROM songs s JOIN songs a ON char_length(s.tags) - char_length(replace(s.tags, ',', '')) >= a.id - 1 ORDER BY tag");
    $tags_result = $tags_query->execute();
    $getID3 = new getID3;
    $ThisFileInfo = $getID3->analyze($infoSong->file_path);
    getid3_lib::CopyTagsToComments($ThisFileInfo);

    if (array_key_exists('tags', $ThisFileInfo)) {
      $findTags = $ThisFileInfo['tags'];
      $song_data['tags'] = $findTags;
    }


    $this->view->song = $infoSong;
    $this->view->tags = $tags_result;
    $this->view->data = $song_data;
    $this->view->musicFolder = addslashes(realpath($this->config->application->musicFolder));

    $sendback_response = array("success"=>false);

    $sendback_response["info"] = $infoSong;
    $sendback_response["tags"] = $tags_result;
    $sendback_response["data"] = $song_data;
    $sendback_response["musicFolder"] = realpath($this->config->application->musicFolder);
    $sendback_response["success"] = true;

    echo json_encode($sendback_response,JSON_PARTIAL_OUTPUT_ON_ERROR);
    die();
  }

  public function deleteSongAction($id) {
    $sendback_response = array("success"=>false);
    $infoSong = Songs::findFirst($id);
    
    if (!file_exists($this->config->application->deleteFolder)) {
      mkdir($this->config->application->deleteFolder, 0755, true);
    }
    rename($infoSong->file_path, $this->config->application->deleteFolder.basename($infoSong->file_path));

    $sendback_response["success"] = true;
    $infoSong->delete();

    return json_encode($sendback_response);
  }


  public function likeSongAction($id) {
    $sendback_response = array("success"=>false);
    $infoSong = Songs::findFirst($id);
    $songObj = $this->request->getJsonRawBody();

    if ($infoSong) {
      $infoSong->like = $songObj->like;
      $infoSong->updated = true;
      if ($infoSong->save()) {
        $sendback_response["success"] = true;
      }
    }

    return json_encode($sendback_response);
  }

  public function updateSongAction($id) {
    $sendback_response = array("success"=>false);
    $infoSong = Songs::findFirst($id);
    $songObj = $this->request->getJsonRawBody();

    if ($infoSong) {
      $infoSong->name = $songObj->name;
      $infoSong->artist = $songObj->artist;
      $infoSong->album = $songObj->album;
      $infoSong->genre = $songObj->genre;
      $infoSong->tags = $songObj->tags;
      $infoSong->track_number = $songObj->no_track;
      $infoSong->rating = $songObj->rating;
      $infoSong->like = $songObj->like;
      $infoSong->lyrics = $songObj->lyrics;
      $infoSong->albumurl = $songObj->albumurl;
      $infoSong->updated = 1;

      if ($infoSong->save()) {
        if ($infoSong->file_path != $songObj->path) {
          if (!file_exists(dirname($songObj->path))) {
            mkdir(dirname($songObj->path), 0755, true);
          }
          if (rename($infoSong->file_path, $songObj->path)) {
            $sendback_response["success"] = true;
            $infoSong->file_path = realpath($songObj->path);
            $infoSong->modification_date = date("Y-m-d H:i:s");
            $infoSong->save();
          } else {
            $sendback_response["message"] = "No se pudo mover el archivo:" + $songObj->path;
          }
        } else {
          $sendback_response["success"] = true;
        }

        if ($sendback_response["success"] == true) {
          require_once($this->config->application->libraryDir."getid3/getid3.php");
          require_once($this->config->application->libraryDir."getid3/write.php");

          $tagwriter = new getid3_writetags;
          $tagwriter->filename = $infoSong->file_path;
          $tagwriter->tagformats = array('id3v2.3');
          
          $tagwriter->overwrite_tags    = true; 
          $tagwriter->remove_other_tags = true; 
          $tagwriter->tag_encoding      = 'UTF-8';
          
          $TagData = array(
            "title" => array($infoSong->name),
            "artist" => array($infoSong->artist),
            "album" => array($infoSong->album),
            "genre" => array($infoSong->genre),
            
            "popularimeter" => array(
              "email"=>"lcastillo0136@hotmail.com",
              "rating"=>($infoSong->rating*255)/5,
              "data"=>round(($infoSong->rating*255)/5)
            ),
            "comment" => array($infoSong->lyrics),
            "track" => array($infoSong->track_number)
          );

          $tagwriter->tag_data = $TagData;
          if ($tagwriter->WriteTags()) {
            $infoSong->modification_date = date("Y-m-d H:i:s");
            $infoSong->save();
          }
        }

      } else {
        $sendback_response["message"] = "No se pudo guardar la informacion:" + json_encode($songObj);
      }
    }

    return json_encode($sendback_response);
  }

  public function getLyricsAction() {
    $songObj = $this->request->getJsonRawBody();
    $url = file_get_contents('https://api.musixmatch.com/ws/1.1/matcher.lyrics.get?apikey=fdf384143cf10a4cafd36024ae19867e&q_track='.urlencode($songObj->q_track).'&q_artist='.urlencode($songObj->q_artist));
    return $url;
  }

  public function fileAction($id) {

    $sendback_response = array("success"=>false);
    $infoSong = Songs::findFirst($id);

    //$infoSong->no_plays = $infoSong->no_plays + 1;
    //$infoSong->save();

    header('Content-Type: audio/mpeg, audio/x-mpeg, audio/x-mpeg-3, audio/mpeg3');
    header('Content-Disposition: filename="song.mp3"');
    readfile($infoSong->file_path);exit;
  }

  public function countAction($id) {
    $sendback_response = array("success"=>false);
    $infoSong = Songs::findFirst($id);

    $infoSong->no_plays = $infoSong->no_plays + 1;
    $infoSong->save();

    $sendback_response['count'] = $infoSong->no_plays;
    $sendback_response['success'] = true;
    return $sendback_response;
  }

  //Ajax
  public function listAction() {
    $sendback_response = array('success' => false, "list"=>array(), "genres"=>array(), "artists"=>array());

    $songs = Songs::find();

    foreach ($songs as $si => $sv) {
      sscanf($sv->duration, "%d:%d:%d", $hours, $minutes, $seconds);
      $time_seconds = isset($seconds) ? $hours * 3600 + $minutes * 60 + $seconds : $hours * 60 + $minutes;
      
      $sendback_response["list"][] = array(
        "filename" => $sv->name,
        "genre" => "",
        "rating"=> $sv->rating,
        "like"=>$sv->like,
        "tags" => array(
          "genre" => $sv->genre,
          "band" => $sv->artist,
        ),
        "date" => $sv->modification_date,
        "no_plays" => $sv->no_plays,
        "id" => $sv->id,
        "filter" => $sv->tags,
        "duration" => $time_seconds,
        "albumurl" => $sv->albumurl,
        "file_path" => $sv->file_path,
        "playing" => false
      );

      if (!in_array($sv->genre, $sendback_response["genres"])) {
        $sendback_response["genres"][] = $sv->genre;
      }

      if (!in_array($sv->artist, $sendback_response["artists"])) {
        $sendback_response["artists"][] = $sv->artist;
      }
    }


    asort($sendback_response["genres"]);
    array_unshift($sendback_response["genres"], "All");


    asort($sendback_response["artists"]);
    array_unshift($sendback_response["artists"], "All");

    $sendback_response["success"] = true;
    return json_encode($sendback_response);
  }

  public function updateAction() {
    $songs_dir = $this->config->application->musicFolder;
  
    $this->scanSongs($songs_dir);    

    die();
  }

  public function scanSongs($songs_dir = false) {
    if (!$songs_dir) return;

    $ficheros  = scandir($songs_dir);
    $songs = array();

    foreach ($ficheros as $f1 => $fval) {
      $song_ready = Songs::findFirst([
        'conditions' => 'file_path = ?1',
        'bind'       => [
          1 => realpath($songs_dir.$fval),
        ]
      ]);

      if (!is_dir($songs_dir.$fval) && $song_ready === false) {
        $fileExtension = pathinfo($songs_dir.$fval);
        if (!in_array($fileExtension["extension"], array("mp3", "ogg", "wma", "aac"))) continue;

        $songObj = new Songs();

        $song_data = array("filename"=>$fval, "type"=>"", "tags"=> array());

        $getID3 = new getID3;
        $ThisFileInfo = $getID3->analyze($songs_dir.'/'.$fval);
        getid3_lib::CopyTagsToComments($ThisFileInfo);

        if (array_key_exists('tags', $ThisFileInfo)) {
          $findTags = $ThisFileInfo['tags'];
          $findTagsv2 = array_key_exists('id3v2', $findTags) ? $findTags['id3v2']:[];
          $findTagsv1 = array_key_exists('id3v1', $findTags) ? $findTags['id3v1']:[];
          if ($findTagsv2 && $findTagsv1) {
            $song_data['tags'] = array_merge($findTags['id3v2'], $findTags['id3v1']);
          } else if ($findTagsv2) {
            $song_data['tags'] = $findTagsv2;
          } else {
            $song_data['tags'] = $findTagsv1;
          }
        } elseif(array_key_exists('error', $ThisFileInfo)) {
          $song_data['error'] = $ThisFileInfo['error'];
        } else {
          $song_data['tags']  = array(
            'genre' => 'Other',
            'band' => 'unknow',
            'album' => 'unknow',
          );
        }

        if (!array_key_exists('genre', $song_data['tags'])) {
          $song_data['tags']['genre'] = 'Other';
        }

        if (!array_key_exists('band', $song_data['tags'])) {
          $song_data['tags']['band'] = 'Unknow';
        }

        if (!array_key_exists('album', $song_data['tags'])) {
          $song_data['tags']['album'] = 'Unknow';
        }

        $songObj->name = basename($song_data["filename"], ".mp3");
        $songObj->artist = $this->getTagValue($song_data['tags'], 'band');
        $songObj->album = $this->getTagValue($song_data['tags'],'album');
        $songObj->genre = $this->getTagValue($song_data['tags'],'genre');
        $songObj->no_plays = '0';
        $songObj->modification_date = date("Y-m-d H:i:s", filemtime($songs_dir.$fval));
        $songObj->track_number = $this->getTagValue($song_data['tags'],'track') ? $this->getTagValue($song_data['tags'],'track') : $this->getTagValue($song_data['tags'],'track_number');


        $songObj->size = filesize($songs_dir.$fval);

        $mp3file = new MP3File($songs_dir.$fval);
        $duration2 = @$mp3file->getDuration();
        $songObj->duration = MP3File::formatTime($duration2);
        $songObj->rating = '0';
        $songObj->like = false;
        $songObj->file_path = realpath($songs_dir.$fval);

        if ( $songObj->save()) {

        } else {

        }
      } else if (is_dir($songs_dir.$fval) && $fval != '.' && $fval != '..') {
        $this->scanSongs($songs_dir.$fval.'/');
      }
    }
  } 
}


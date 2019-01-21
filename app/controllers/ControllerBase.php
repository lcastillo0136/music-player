<?php

use Phalcon\Mvc\Controller;

class ControllerBase extends Controller {
  protected function getTagValue($tag, $needle) {
    return is_array($tag) && array_key_exists($needle, $tag) && isset($tag[$needle]) ? (is_array($tag[$needle]) && count($tag[$needle]) > 0 ? $tag[$needle][0] : (isset($tag[$needle]) ? $tag[$needle] : false) ) : false;
  }

  public function FileSizeConvert($bytes) {
    $bytes = floatval($bytes);
    $arBytes = array(
      0 => array(
        "UNIT" => "TB",
        "VALUE" => pow(1024, 4)
      ),
      1 => array(
        "UNIT" => "GB",
        "VALUE" => pow(1024, 3)
      ),
      2 => array(
        "UNIT" => "MB",
        "VALUE" => pow(1024, 2)
      ),
      3 => array(
        "UNIT" => "KB",
        "VALUE" => 1024
      ),
      4 => array(
        "UNIT" => "B",
        "VALUE" => 1
      ),
    );

    foreach($arBytes as $arItem) {
      if($bytes >= $arItem["VALUE"]) {
        $result = $bytes / $arItem["VALUE"];
        $result = str_replace(".", "," , strval(round($result, 2)))." ".$arItem["UNIT"];
        break;
      }
    }
    return $result;
  }
}

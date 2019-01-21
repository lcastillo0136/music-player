<?php

class Songs extends \Phalcon\Mvc\Model
{

    /**
     *
     * @var integer
     */
    public $id;

    /**
     *
     * @var string
     */
    public $name;

    /**
     *
     * @var string
     */
    public $artist;

    /**
     *
     * @var string
     */
    public $album;

    /**
     *
     * @var string
     */
    public $genre;

    /**
     *
     * @var integer
     */
    public $no_plays;

    /**
     *
     * @var string
     */
    public $modification_date;

    /**
     *
     * @var string
     */
    public $lyrics;

    /**
     *
     * @var integer
     */
    public $track_number;

    /**
     *
     * @var double
     */
    public $rating;

    /**
     *
     * @var string
     */
    public $duration;

    /**
     *
     * @var double
     */
    public $size;

    /**
     *
     * @var boolean
     */
    public $like;

    /**
     *
     * @var string
     */
    public $file_path;

    /**
     *
     * @var string
     */
    public $albumurl;

    /**
     *
     * @var boolean
     */
    public $updated;

    /**
     * Initialize method for model.
     */
    public function initialize()
    {
        $this->setSchema("songs_local");
        $this->setSource("songs");
    }

    /**
     * Returns table name mapped in the model.
     *
     * @return string
     */
    public function getSource()
    {
        return 'songs';
    }

    /**
     * Allows to query a set of records that match the specified conditions
     *
     * @param mixed $parameters
     * @return Songs[]|Songs|\Phalcon\Mvc\Model\ResultSetInterface
     */
    public static function find($parameters = null)
    {
        return parent::find($parameters);
    }

    /**
     * Allows to query the first record that match the specified conditions
     *
     * @param mixed $parameters
     * @return Songs|\Phalcon\Mvc\Model\ResultInterface
     */
    public static function findFirst($parameters = null)
    {
        return parent::findFirst($parameters);
    }

}


if (!String.prototype.toCommas) {
  String.prototype.toCommas = function() {
    var parts = this.toString().split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.join(".");
  }
}

if (!Array.prototype.unique) {
  Array.prototype.unique = function(array2) {
    var result_array = [], arr = this.concat(array2), len = arr.length, assoc = {};
    while(len--) {
      var item = arr[len];
      if(!assoc[item]) { 
        result_array.unshift(item);
        assoc[item] = true;
      }
    }
    return result_array;
  };
  Array.prototype.shuffle = function () {
    for (let i = this.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this[i], this[j]] = [this[j], this[i]];
    }
    return this;
  };
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function loadHash() {
  var current_hash = window.location.hash;
  if ($.trim(current_hash) != '') {
    current_hash = current_hash.substring(1);
    $.get(current_hash, function(data) {
      
    });
  }
}

$(window).on('hashchange', function() {
  loadHash();
});

var store = {
  state: {
    songs: [],
    artist: [],
    genres: [],
    artists: [],
    battery: {
      charging: false,
      level: 1
    }
  },
  setMedia: function(mediaList) {
    this.state.songs = mediaList
  }
};


navigator.getBattery().then(function(batteryManager) {
  if (batteryManager) {
    batteryManager.onchargingchange = () => {store.state.battery.charging = batteryManager.charging;};
    batteryManager.onlevelchange = ()=>{store.state.battery.level = batteryManager.level;};

    store.state.battery.level = batteryManager.level;
    store.state.battery.charging= batteryManager.charging;
  }
});


Vue.component('star-rating', VueStarRating.default);
Vue.component('music-player', {
  data: function () {
    return {
      player: false,
      current: false,
      muted: false,
      currentTime: 0,
      volume: localStorage.getItem('player.volume') || 0.8,
      repeat: (localStorage.getItem('player.repeat') && localStorage.getItem('player.repeat') == 'true') || false,
      shuffle: (localStorage.getItem('player.shuffle') && localStorage.getItem('player.shuffle') == 'true') || false
    }
  },
  filters: {
    durationMin: function(v) {
      var hrs = ~~(v / 3600), mins = ~~((v % 3600) / 60), secs = ~~v % 60, ret = "";

      if (hrs > 0) {
          ret += "" + hrs + ":" + (mins < 10 ? "0" : "");
      }

      ret += "" + mins + ":" + (secs < 10 ? "0" : "");
      ret += "" + secs;
      return ret;
    },
  },
  mounted: function() {
    const that = this;
    this.player = $("#jplayer_N").jPlayer( {
      ready: function () {
        $('body').on('keydown', function(evt) {
          if (evt.target == document.body) {
            if ((evt.keyCode || evt.which) == 32) {
              that.play();
              evt.preventDefault();
            }
            if ((evt.keyCode || evt.which) == 37) { // left
              that.previous();
              evt.preventDefault();
            } 

            if ((evt.keyCode || evt.which) == 39 ) { // right
              that.next();
              evt.preventDefault();
            }

            if ((evt.keyCode || evt.which) == 76) { // L key
              //show list
              evt.preventDefault();
            }
            if ((evt.keyCode || evt.which) == 38) { // Up
              that.player.jPlayer("volume", that.volume + (that.volume>=1?0:0.1));
              evt.preventDefault();
            }
            if ((evt.keyCode || evt.which) == 40) { // down
              that.player.jPlayer("volume", that.volume-(that.volume<=0?0:0.1));
              evt.preventDefault();
            }

            if ((evt.keyCode || evt.which) == 83) { // shuffle
              that.setShuffle();
            }

            if ((evt.keyCode || evt.which) == 82) { // repeat
              that.setRepeat();
            }
          }
        });
      },
      timeupdate: function(evt) {
        that.currentTime = evt.jPlayer.status.currentTime;
      },
      ended: function() {
        var count_song = that.playlist[that.current].song.id;
        setTimeout(function(){
          axios.get('/song/end/' + count_song);
        }, 2000);
        
        if (that.playlist.length > 0) {
          if (that.current < that.playlist.length-1) {
            that.playlist[that.current].song.playing = false;
            that.current+=1;
            that.playlist[that.current].song.playing = true;
            that.player.jPlayer('setMedia', that.playlist[that.current]).jPlayer("play");
          } else {
            that.playlist[that.current].song.playing = false;
            if (that.repeat) {
              that.current=0;
              that.playlist[that.current].song.playing = true;
              that.player.jPlayer('setMedia', that.playlist[that.current]).jPlayer("play");
            } else {
              that.stop();
            }
          }
        } else {

        }
        localStorage.setItem('player.list', JSON.stringify(that.playlist));
      },
      volumechange : function(evt) {
        that.volume = evt.jPlayer.options.volume;
        localStorage.setItem('player.volume', that.volume);
      },
      supplied: "mp3",
      swfPath: "/jPlayer/js",
      volume: this.volume
    });

    
  },
  watch: {
    playlist: function(n, o) {
      localStorage.setItem('player.list', JSON.stringify(n));
    },
  },
  computed: {
    isPlaying: function() {
      return this.playlist.findIndex(f=>f.song.playing) > -1;
    },
    duration: function() {
      if (this.isPlaying) {
        return (this.playlist[this.current] && this.playlist[this.current].song.duration) || '--';
      }
      return "--";
    },
    song: function() {
      if (this.isPlaying) {
        return this.playlist[this.current];
      }
      return false;
    },
    baridth: function() {
      return ((this.currentTime*100)/this.duration) >= 100 ? 100 : ((this.currentTime*100)/this.duration);
    },
  },
  methods: {
    add: function(s, p, d) {
      if (p !== false) p = true;
      if (d !== false) d = 0;
      if (this.playlist.findIndex(f=>f.song.id==s.song.id) == -1) {
        this.playlist.push(s);
        if (p) this.current = this.playlist.length-1;
      } else {
        if (p) this.current = this.playlist.findIndex(f=>f.song.id==s.song.id);
      }

      if (p) {
        this.player.jPlayer('setMedia', this.playlist[this.current]).jPlayer("play", d);
      }
      localStorage.setItem('player.list', JSON.stringify(this.playlist));
    },
    select: function(i) {
      if (this.current !== false && this.current > -1) {
        this.playlist[this.current].song.playing = false;
      }
      if (this.current !== i) { 
        this.current = i;
        this.playlist[this.current].song.playing = true;
        this.player.jPlayer('setMedia', this.playlist[i]).jPlayer("play");
      } else {
        this.pause();
      }
      localStorage.setItem('player.list', JSON.stringify(this.playlist));
    },
    stop: function() {
      this.current = false;
      this.player.jPlayer('stop');
      localStorage.setItem('player.list', JSON.stringify(this.playlist));
    },
    play: function() {
      if (this.current !== false && this.current > -1) {
        if (this.isPlaying) {
          this.player.jPlayer("pause");
          this.playlist[this.current].song.playing = false;
        } else {
          this.playlist[this.current].song.playing = true;
          this.player.jPlayer("play");
        }
      }
      localStorage.setItem('player.list', JSON.stringify(this.playlist));
    },
    pause: function() {
      if (this.current !== false && this.current > -1) {
        if (this.isPlaying) {
          this.player.jPlayer("pause");
          this.playlist[this.current].song.playing = false;
        } 
      }
      localStorage.setItem('player.list', JSON.stringify(this.playlist));
    },
    previous: function() {
      if (this.current !== false && this.current > -1 && this.current-1>=0) {
        this.pause();
        this.current-=1;
        this.playlist[this.current].song.playing = true;
        this.player.jPlayer('setMedia', this.playlist[this.current]).jPlayer("play");
      }
      localStorage.setItem('player.list', JSON.stringify(this.playlist));
    },
    next: function() {
      if (this.current !== false && this.current > -1 && this.current+1<=this.playlist.length-1) {
        this.pause();
        this.current+=1;
        this.playlist[this.current].song.playing = true;
        this.player.jPlayer('setMedia', this.playlist[this.current]).jPlayer("play");
      }
      localStorage.setItem('player.list', JSON.stringify(this.playlist));
    },
    mute: function(muted) {
      if (muted !== false && muted !== true) muted = true;
      this.player.jPlayer(muted ? "mute" : "unmute");
      this.muted = muted;
    },
    remove: function(i) {
      if (this.playlist[i].song.playing) {
        this.playlist[i].song.playing = false;
        this.stop();
      }
      this.playlist.splice(i, 1);

      if (this.playlist.findIndex(f=>f.song.playing) > -1) {
        this.current = this.playlist.findIndex(f=>f.song.playing);
      } else {
        this.current = false;
      }
    },
    selectedTime: function(event) {
      var select_time = (event.offsetX * 100) /event.srcElement.offsetWidth;
      select_time = (select_time * this.duration) / 100;
      this.player.jPlayer("play", select_time);
    },
    selectVolume: function(event) {
      var select_volume = (event.offsetX * 100) /event.srcElement.offsetWidth;
      select_volume = (select_volume * 1) / 100;
      this.player.jPlayer("volume", select_volume);
      localStorage.setItem('player.volume', select_volume);
    },
    setRepeat: function() {
      this.repeat = !this.repeat;
      localStorage.setItem('player.repeat', this.repeat);
    },
    setShuffle: function() {
      if (this.playlist.length > 0) {
        this.playlist = this.playlist.shuffle();
        this.shuffle = !this.shuffle;
        localStorage.setItem('player.shuffle', this.shuffle);
        localStorage.setItem('player.list', JSON.stringify(this.playlist));
      }
    },
    cleanList: function() {
      this.shuffle = true;
      this.setShuffle();
        
      if (this.current && this.current > -1) {
        this.playlist[this.current].song.playing = false;
      }

      for(let i=this.playlist.length-1;i>=0;i--) {
        this.remove(i);
      }

      this.stop();
      localStorage.setItem('player.list', JSON.stringify(this.playlist));
    }
  },
  props: ['playlist'],
  template: document.getElementById('music-player-template').innerHTML
});

axios.get('/songs/list/', {
  params: {

  }
}).then(function (response) {
  if (response.data.success) {
    store.state.songs = response.data.list;
    store.state.genres = response.data.genres;
    store.state.artists = response.data.artists;

    (eval(localStorage.getItem('player.list')) || []).forEach(function(e, i) {
      if (store.state.songs.find((s)=>s.id==e.song.id)) {
        var songToPlay = store.state.songs.find((s)=>s.id==e.song.id);
        songToPlay.playing = e.song.playing;
        (window['playListContentVuw']||window['infoSongContentVue']||window['indeContentVuw']||window['artistListVue']).$refs.player.add({
          title: songToPlay.name || songToPlay.filename,
          artist: songToPlay.artist || songToPlay.tags.band,
          album: songToPlay.album,
          mp3: '/song/'+songToPlay.id+'.mp3',
          poster: "",
          song: songToPlay
        }, songToPlay.playing);
      }
    });
  }
})
.catch(function (error) {
  
});

var mixin = {
  data: {
    state: store.state,
    playlist: []
  },
  watch: {

  },
  computed: {
    songCount: function() {
      return this.state.songs.length.toString().toCommas();
    },
    songs: function() {
      return this.state.songs;
    }
  },
  filters: {
    durationMin: function(v) {
      var hrs = ~~(v / 3600), mins = ~~((v % 3600) / 60), secs = ~~v % 60, ret = "";

      if (hrs > 0) {
          ret += "" + hrs + ":" + (mins < 10 ? "0" : "");
      }

      ret += "" + mins + ":" + (secs < 10 ? "0" : "");
      ret += "" + secs;
      return ret;
    },
    filesize: function(v) {
      var arBytes = [{u: 'TB',v: Math.pow(1024,4)},{u: 'GB',v: Math.pow(1024,3)},{u: 'MB',v: Math.pow(1024,2)},{u: 'KB',v: 1024},{u: 'B',v: 1}];
      return (Math.round((v / arBytes.find((o)=>{return v>o.v;}).v)*100)/100) + ' ' + arBytes.find((o)=>{return v>o.v;}).u;
    },
    tags: function(v) {
      return v.split(',');
    },
  },
  methods: {
    clearFilter: function(s) {
      s = s.toLowerCase().trim();
      s = s.replace(/á/g, "a").replace(/é/g, "e").replace(/í/g, "i").replace(/ó/g, "o").replace(/ú/g, "u").replace(/ý/g, "y");
      s = s.replace(/ä/g, "a").replace(/ë/g, "e").replace(/ï/g, "i").replace(/ö/g, "o").replace(/ü/g, "u").replace(/ÿ/g, "y");
      s = s.replace(/à/g, "a").replace(/è/g, "e").replace(/ì/g, "i").replace(/ò/g, "o").replace(/ù/g, "u");
      s = s.replace(/â/g, "a").replace(/ê/g, "e").replace(/î/g, "i").replace(/ô/g, "o").replace(/û/g, "u");
      s = s.replace(/\'/g, "").replace(/`/g, "");
      s = s.replace(/#/g,'');
      return s;
    },
    playSong: function(songToPlay, playNow) {
      if (playNow !== false) playNow=true;
      if (songToPlay.id == (this.songs.find((s)=>s.playing) || { id: false }).id) {
        (window['playListContentVuw']||window['infoSongContentVue']||window['indeContentVuw']||window['artistListVue']).$refs.player.pause();
        songToPlay.playing = false;
        return;
      }

      (this.songs.find((s)=>s.playing&&playNow) || { playing: false }).playing = false;

      songToPlay.playing = playNow;

      (window['playListContentVuw']||window['infoSongContentVue']||window['indeContentVuw']||window['artistListVue']).$refs.player.add({
        title: songToPlay.name || songToPlay.filename,
        artist: songToPlay.artist || songToPlay.tags.band,
        album: songToPlay.album,
        mp3: '/song/'+songToPlay.id+'.mp3',
        poster: "",
        song: songToPlay
      }, playNow);
    },
    deletesong: function(songToDelete,a) {
      var that  = this;
      swal({
        title: 'Are you sure?',
        position: 'top',
        text: "You won't be able to revert this!",
        type: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, delete it!',
        showLoaderOnConfirm: true,
        preConfirm: function() {
          return axios.delete('/song/'+songToDelete.id, {
            params: {

            }
          }).then(function (response) {
            if (response.data.success) {
              var deletedIndex = that.state.songs.findIndex(f=>f.id == songToDelete.id);
              that.state.songs.splice(deletedIndex, 1);
            }
            return response.data;
          })
          .catch(function (error) {
            
          }); 
        },    
        allowOutsideClick: function() {
          return !swal.isLoading();
        }
      }).then(function(result) {
        if (result.value.success) {
          swal({
            title: 'Deleted!',
            text: 'Your file has been deleted.',
            type: 'success',
            position: 'top',
          }).then(function() {
            
          });
        }
      });
    }
  },
  mounted: function() {
    
  }
};

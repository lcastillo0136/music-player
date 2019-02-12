
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

var store = {
  state: {
    songs: [],
    menu: {
      open: false
    }
  }
};

var mixin = {
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
      if (songToPlay.id == (store.state.songs.find((s)=>s.playing) || { id: false }).id) {
        musicApp.$refs.player.pause();
        songToPlay.playing = false;
        return;
      }

      (store.state.songs.find((s)=>s.playing&&playNow) || { playing: false }).playing = false;

      songToPlay.playing = playNow;

      musicApp.$refs.player.add({
        title: songToPlay.name || songToPlay.filename,
        artist: songToPlay.artist || songToPlay.tags.band,
        album: songToPlay.album,
        mp3: '/song/'+songToPlay.id+'.mp3',
        poster: "",
        song: songToPlay
      }, playNow);
    }
  }
};

Vue.component('star-rating', VueStarRating.default);
Vue.component('music-player', {
  mixins: [mixin],
  props: ['playlist'],
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
        setTimeout(function() {
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

      return '--';
    },
    song: function() {
      if (this.isPlaying) {
        return this.playlist[this.current];
      }

      return '--';
    },
    baridth: function() {
      return ((this.currentTime*100)/this.duration) >= 100 ? 100 : ((this.currentTime*100)/this.duration);
    }
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
      if (this.current !== i) { 
        this.pause();
        this.current = i;
        this.playlist[this.current].song.playing = true;
        this.player.jPlayer('setMedia', this.playlist[i]).jPlayer("play");
      } else {
        this.pause();
      }
      localStorage.setItem('player.list', JSON.stringify(this.playlist));
    },
    remove: function(index) {
      if (this.playlist[index].song.playing) {
        if(!this.next()){
          this.stop();
        }
      }
      this.playlist.splice(index, 1);
      this.current = this.playlist.findIndex(f=>{return f.song.playing});
    },
    stop: function() {
      this.playlist[this.current].song.playing = false;
      this.current = false;
      this.player.jPlayer('stop');
      localStorage.setItem('player.list', JSON.stringify(this.playlist));
    },
    play: function() {
      if (this.current !== false && this.current > -1) {
        if (this.isPlaying) {
          this.player.jPlayer('pause');
          this.playlist[this.current].song.playing = false;
        } else {
          this.playlist[this.current].song.playing = true;
          this.player.jPlayer("play");
        }
      }
      localStorage.setItem('player.list', JSON.stringify(this.playlist));
    },
    pause: function(force) {
      if (this.current !== false && this.current > -1) {
        if (this.isPlaying) {
          this.player.jPlayer("pause");
          this.playlist[this.current].song.playing = false;
        } else {
          this.play();
        }
      }
      localStorage.setItem('player.list', JSON.stringify(this.playlist));
    },
    next: function() {
      if (this.current !== false && this.current > -1 && this.current +1 <= this.playlist.length-1) {
        this.pause();
        this.current+=1;
        this.player.jPlayer('setMedia', this.playlist[this.current]).jPlayer("play");
        this.play();
        localStorage.setItem('player.list', JSON.stringify(this.playlist));
        return true;
      }
      return false;
    },
    previous: function() {
      if (this.current !== false && this.current > -1 && this.current-1 >= 0) {
        this.pause();
        this.current-=1;
        this.player.jPlayer('setMedia', this.playlist[this.current]).jPlayer("play");
        this.play();
        localStorage.setItem('player.list', JSON.stringify(this.playlist));
        return true;
      }
      return false;
    },
    mute: function(muted) {
      if (muted !== false && muted !== true) muted = true;
      this.player.jPlayer(muted ? 'mute': 'unmute');
      this.muted = muted;
    },
    selectedTime: function(event) {
      var selected_time = (event.offsetX * 100) / event.srcElement.offsetWidth;
      selected_time = (selected_time * this.duration) / 100;
      this.player.jPlayer('play', selected_time);
    },
    selectVolume : function(event) {
      var selected_volume = (event.offsetX * 100) / event.srcElement.offsetWidth;
      selected_volume = (selected_volume * 1) / 100;
      this.player.jPlayer('volume', selected_volume);
      localStorage.setItem('player.volume', selected_volume);
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

      if (this.current !== false && this.current > -1) {
        this.stop();
        this.playlist = [];
        localStorage.removeItem('player.list');
      }
    }
  },
  template: document.getElementById('music-player-template').innerHTML
});

Vue.component('music-header', {
  mixins: [mixin],
  props: {
    value: Object,
    songs: Array
  },
  data: function() {
    return {
      query: '',
      header: {
        notifications: {
          open: false
        },
        profile: {
          open: false
        }
      }
    }
  },
  computed: {
    songsQuery: function() {
      return this.songs.slice(0).filter((is)=> {
        return this.clearFilter(this.query) !== '' && this.clearFilter(Object.values(is).join('')+Object.values(is.tags).join('')).indexOf(this.clearFilter(this.query)) > -1
      })
    }
  },
  methods: {
    showNotifications: function() {

    },
    showProfile: function() {

    }
  },
  template: '#music-header'
});

Vue.component('music-leftmenu', {
  props: {
    value: Object
  },
  template: '#music-leftmenu'
})

const Discovery = { 
  mixins: [mixin],
  data: function () {
    return {
      player: {
        available: true
      },
      playlist: []
    }
  },
  computed: {
    discoverSongs: function() {
      var rand_arr = [];
      for(var indexSong=0;indexSong<12;indexSong++) {
        rand_arr.push(Math.floor(Math.random() * store.state.songs.length));
      }
      return store.state.songs.slice(0).filter((f,fi)=>rand_arr.includes(fi));
    },
    newSongs: function() {
      return store.state.songs.slice(0).sort((a,b)=>new Date(b.date)-new Date(a.date));
    },
    topSongs: function() {
      return store.state.songs.slice(0).sort((a,b)=>b.no_plays-a.no_plays);
    }
  },
  template: document.getElementById('discovery-template').innerHTML 
};



const routes = [
  { path: '/', component: Discovery }
];

const router = new VueRouter({
  routes: routes
});




const musicApp = new Vue({
  router: router,
  el: '#music-app',
  data: {
    state: store.state,
    playlist: [],
    player: {
      available: true
    },
    menu: {
      open: false
    },
    query: ""
  },
  mounted: function() {
    axios.get('/songs/list/', {
      params: {

      }
    }).then((response)=> {
      if (response.data.success) {
        this.state.songs = response.data.list;
        this.state.genres = response.data.genres;
        this.state.artists = response.data.artists;

        (eval(localStorage.getItem('player.list')) || []).forEach((e, i)=> {
          if (this.state.songs.find((s)=>s.id==e.song.id)) {
            var songToPlay = this.state.songs.find((s)=>s.id==e.song.id);
            songToPlay.playing = e.song.playing;
            musicApp.$refs.player.add({
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
  }
});
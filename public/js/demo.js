
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
      if (playNow === true) {
        musicApp.playSong(songToPlay);
      } else {
        musicApp.addSong(songToPlay);
      }
    }
  }
};
Vue.config.devtools = true;

Vue.component('star-rating', VueStarRating.default);
Vue.component('a-player', VueAPlayer.APlayer);

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
      playlist: [],
      loading: false
    }
  },
  methods: {
    refresh: function() {
      this.loading = true;
      axios.get('/songs/update').then(()=>{
        this.loading = false;
      });

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

const Playlist = {
  mixins: [mixin],
  data: function () {
    return {
      player: {
        available: true
      },
      playlist: [],
      filter: '',
      selected: {
        genre: localStorage.getItem('genre') || 'All',
        page: 1,
        action: ''
      },
      listType: localStorage.getItem('listType') || 'box'
    }
  },
  watch: {
    listType: function() {
      localStorage.setItem('listType', this.listType);
    },
    filter: function(n, o) {
      var nf = $.trim(n), of = $.trim(o);
      if (nf != of) {

      }
    },
    selected: {
      deep: true,
      handler: function(n, o) {
        localStorage.setItem('genre', n.genre);
      }
    }
  },
  computed: {
    songCount: function() {
      return store.state.songs.length.toString().toCommas();
    },
    pagelimit: function() {
      var that = this;
      return Math.ceil(store.state.songs.filter(is=>(is.tags.genre == that.selected.genre || that.selected.genre == 'All') && (that.clearFilter(that.filter)==''||that.clearFilter(Object.values(is).join('')).indexOf(that.clearFilter(that.filter))>-1||that.clearFilter(Object.values(is.tags).join('')).indexOf(that.clearFilter(that.filter))>-1)).length / 18);
    },
    songsTable: function() {
      var that = this;
      return store.state.songs.slice(0).filter((is)=> {
        return (is.tags.genre == that.selected.genre || that.selected.genre == 'All') && (that.clearFilter(that.filter)==''||that.clearFilter(Object.values(is).join('')).indexOf(that.clearFilter(that.filter))>-1||that.clearFilter(Object.values(is.tags).join('')).indexOf(that.clearFilter(that.filter))>-1)
      });
    },
  },
  methods: {
    applyListAction: function() {
      const that = this;
      if (this.selected.action != '') {
        this.songsTable.slice(0).forEach(f=>{
          musicApp.addSong(f);
        });
        this.selected.action = '';
      }
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
              var deletedIndex = store.state.songs.findIndex(f=>f.id == songToDelete.id);
              store.state.songs.splice(deletedIndex, 1);
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
        if (result.dismiss != 'overlay' && result.dismiss != 'cancel') {
          if (result.value.success) {
            swal({
              title: 'Deleted!',
              text: 'Your file has been deleted.',
              type: 'success',
              position: 'top',
            }).then(function() {
              
            });
          }
        }
      });
    }
  },
  template: document.getElementById('playlist-template').innerHTML
};

const InfoSong = {
  mixins: [mixin],
  data:  function () {
    return {
      player: {
        available: true
      },
      song: false,
      folder: '',
      lyrics: [],
      tags: [],
      showlist: {
        artist: false,
        genres: false
      },
      status: false
    }
  },
  watch: {
    song: {
      deep:true,
      handler: function() {
        this.song.file_path = this.folder + '\\' + this.song.artist.replace(/[\\\/\:\*\.\?"“”’<>|']/g, '') + '\\' + this.song.album.replace(/[\\\/\:\*\.\?""“”’<>|']/g, '') + '\\' + this.song.artist.replace(/[""“”’]/g,'') + ' - ' + this.song.track_number + ' - ' +this.song.name.replace(/[""“”’]/g,'') + (this.song.name.indexOf('.mp3') > -1 ? '' : '.mp3');
      }
    },  
    '$route' (to, from) {
      var that = this;
      if (to.params.id != from.params.id) {
        axios.get('/songs/'+to.params.id).then(function(response) {
          if (response.data.success) {
            that.song = response.data.info;
            that.folder = response.data.musicFolder;
            that.tags = response.data.tags;

            setTimeout(function() {
              $(".chosen-select").chosen({
                enableAddOnEnter: true
              }).on('change', function(evt) {
                that.selectTags(evt);
              });
            }, 1000);
          }
        }).catch(function() {
          window.history.back();
        });
      }
    }
  
  },
  computed: {
    path: function() {
      return this.song.file_path;
    },
    artistFilter: function() {
      var that = this;
      return store.state.artists.filter((a)=>{
        return that.clearFilter(a).indexOf(that.clearFilter(that.song.artist)) > -1 && that.clearFilter(that.song.artist) != that.clearFilter(a);
      });
    },
    genresFilter: function() {
      var that = this;
      return store.state.genres.filter((a)=>{
        return that.clearFilter(a).indexOf(that.clearFilter(that.song.genre)) > -1 && that.clearFilter(that.song.genre) != that.clearFilter(a);
      });
    },
    globalSong: function() {
      const that = this;
      return store.state.songs.find(f=>f.id == that.song.id)||{playing:false};
    }
  },
  methods: {
    saveSongInfo: function() {
      var that = this;
      this.status  = 'loading';
      axios.put('/songs/'+that.song.id +'/', {
        name: that.song.name,
        artist: that.song.artist,
        album: that.song.album,
        genre: that.song.genre,
        no_track: that.song.track_number,
        like: that.song.like,
        tags: that.song.tags,
        rating: that.song.rating,
        lyrics: that.song.lyrics,
        path: that.song.file_path,
        albumurl: that.song.albumurl
      }).then(function (response) {
        if (response.data.success) {
          var current_updated_song = that.globalSong;
          current_updated_song.filename = that.song.name;
          current_updated_song.genre = that.song.genre;
          current_updated_song.file_path = that.song.file_path;
          current_updated_song.rating = that.song.rating;
          current_updated_song.tags.band = that.song.artist;
          current_updated_song.tags.genre = that.song.genre;
          that.status = '';
        } else if (response.data.message && response.data.message != '') {
          that.status = response.data.message;
        }
      }).catch(function (error) {});
    },
    selectTags: function(v) {
      this.song.tags = $(v.target.selectedOptions).map((i,e)=> $(e).val()).toArray().join(',');
    },
    findData: function() {
      var that = this;
      this.showlist.artist = false;
      if (this.song.artist != '' && this.song.name != '') {
        axios.get('http://ws.audioscrobbler.com/2.0/', {
          params: {
            "method": "track.getInfo",
            "api_key": "ed3f6345c0413625687fdb95191bb452",
            "artist": this.song.artist,
            "track": this.song.name,
            "format": "json",
            "autocorrect": 1
          }
        }).then((r)=>{
          if (r.data.track) {
            if (that.song.artist != r.data.track.artist.name) {
              that.song.artist = r.data.track.artist.name;
            }
            if (that.song.name != r.data.track.name) {
              that.song.name = r.data.track.name;
            }
            if (r.data.track.album && that.song.album != r.data.track.album.title) {
              that.song.album = r.data.track.album.title;
            }
          }
        }).catch((e)=>{
          
        }).then((r)=> {
          if (!that.song.lyrics || that.song.lyrics == '') {
            axios.put('/song/' + that.song.id+'/lyrics/', {
              q_track: this.song.name,
              q_artist: this.song.artist
            }).then(f=>{
              if (f.data.message.header.status_code == 200) {
                that.song.lyrics = f.data.message.body.lyrics.lyrics_body;
              }
            }).catch(e=>{

            });
          }
        });
      }

      if ((!this.song.albumurl || this.song.albumurl == '') && this.song.artist != '' && this.song.album != '') {
        axios.get('http://ws.audioscrobbler.com/2.0/', {
          params: {
            "method": "album.getinfo",
            "api_key": "ed3f6345c0413625687fdb95191bb452",
            "artist": this.song.artist,
            "album": this.song.album,
            "format": "json",
            "autocorrect": 1
          }
        }).then((r)=>{
          if (r.data.album && r.data.album.image) {
            if (r.data.album.image[4]["#text"] != '') {
              that.song.albumurl = r.data.album.image[4]["#text"];
            }
          }
        }).catch((e)=>{
          
        });
      }
    }
  },
  mounted: function() {
    var that = this;
    axios.get('/songs/'+that.$route.params.id).then(function(response) {
      if (response.data.success) {
        that.song = response.data.info;
        that.folder = response.data.musicFolder;
        that.tags = response.data.tags;

        setTimeout(function() {
          $(".chosen-select").chosen({
            enableAddOnEnter: true
          }).on('change', function(evt) {
            that.selectTags(evt);
          });
        }, 1000);

      }
    }).catch(function() {
      window.history.back();
    });
  }, 
  template: document.getElementById('song-info-template').innerHTML 
};


const routes = [
  { path: '/', component: Discovery , alias: '/discovery'},
  { path: '/songs/:id', component: InfoSong },
  { path: '/songs', component: Playlist }
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
  watch: {
    playlist: {
      handler: function() {
        localStorage.setItem('player.list', JSON.stringify(this.playlist));
      },
      deep: true
    }
  },
  computed: {
    song: function(){
      return this.state.songs.find(s=>s.playing);
    }
  },
  methods: {
    removeClick: function(obj, id) {
      this.playlist.splice(id, 1);
    },
    addSong: function(song) {
      this.playlist.push({
        name: song.filename,
        artist: song.tags.band,
        url: '/song/'+song.id+'.mp3',
        cover: song.albumurl || '/img/a2.png', // prettier-ignore
      });
    },
    playSong: function(song) {
      this.addSong(song);
      this.$refs.player.switch(this.$refs.player.orderList.length-1);
      this.$refs.player.play();
    },
    clearList: function() {
      this.playlist = [];
    },
    setSong: function(evt, song) {
      if (this.state.songs.find(f=>f.playing)) {
        this.state.songs.find(f=>f.playing).playing = false;
      }
      if (this.state.songs.find(f=>'/song/'+f.id+'.mp3'==song.url)) this.state.songs.find(f=>'/song/'+f.id+'.mp3'==song.url).playing = true;
    },
    saveCount: function() {
      if (this.$refs.player.currentPlayed > 0.750 && !this.song.counted) {
        axios.get('/song/end/'+this.song.id).then(()=> {
          this.song.counted = true;
        });
      }
    }
  },
  beforeMount: function() {
    if (eval(localStorage.getItem('player.list'))) {
      this.playlist = eval(localStorage.getItem('player.list'));
    };

    axios.get('/songs/list/', {
      params: {

      }
    }).then((response)=> {
      if (response.data.success) {
        this.state.songs = response.data.list;
        this.state.genres = response.data.genres;
        this.state.artists = response.data.artists;
      }
    })
    .catch(function (error) {
      
    });
  },
  mounted: function() {
    var that = this;
    $('body').on('keydown', function(evt) {
      if (evt.target == document.body) {
        if ((evt.keyCode || evt.which) == 32) {
          that.$refs.player.toggle();
          evt.preventDefault();
        }
        if ((evt.keyCode || evt.which) == 37) { // left
          that.$refs.player.skipBack();
          evt.preventDefault();
        } 

        if ((evt.keyCode || evt.which) == 39 ) { // right
          that.$refs.player.skipForward();
          evt.preventDefault();
        }

        if ((evt.keyCode || evt.which) == 76) { // L key
          that.$refs.player.toggleList();
          evt.preventDefault();
        }
        if ((evt.keyCode || evt.which) == 38) { // Up
          that.$refs.player.volume = that.$refs.player.volume + (that.$refs.player.volume>=1?0:0.1);
          evt.preventDefault();
        }
        if ((evt.keyCode || evt.which) == 40) { // down
          that.$refs.player.volume = that.$refs.player.volume-(that.$refs.player.volume<=0?0:0.1);
          evt.preventDefault();
        }
      }
    });
  }
});
// Generated by CoffeeScript 2.3.0
"use strict";
var ref1;

import React from "react";
import T from "prop-types";
import createClass from "create-react-class";
import update from "immutability-helper";

// @ifdef NATIVE
import {
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Linking,
  NetInfo,
  BackHandler,
  Platform,
  AppState,
  SafeAreaView
} from "react-native";
import { UploadQueue } from "./upload-queue";
import { styles, Text } from "./styles";
import { Terms } from "./native-terms";
import RNFS from "react-native-fs";
import firebase from "react-native-firebase";
import Permissions from "react-native-permissions";
import { NativeLogin } from "./native-login";
import { NativeHome, Loading } from "./native-home";
import Orientation from 'react-native-orientation-locker';
// @endif

import { Auth, Game, displayError } from "./aris";
// @ifdef NATIVE
import { SiftrViewPW, downloadGame } from "./siftr-view";
// @endif
// @ifdef WEB
import { SiftrView } from "./siftr-view";
import { WebNav } from "./web-nav";
// @endif

import { withSuccess } from "./utils";

import { parseUri } from "./parse-uri";

// @ifdef NATIVE
const recentlyOpened = `${RNFS.DocumentDirectoryPath}/recent.json`;
// @endif

export var SiftrNative = createClass({
  displayName: "SiftrNative",

  getInitialState: function() {
    return {
      auth: null,
      games: null,
      followed: null,
      game: null,
      menuOpen: false,
      online: true,
      screen: 'home',
      settings: false,
      recent: null,
    };
  },

  getDefaultProps: function() {
    return {
      viola: false
    };
  },

  // @ifdef WEB
  componentWillMount: function() {
    this.login();
  },
  // @endif

  // @ifdef NATIVE
  componentDidMount: function() {
    RNFS.readFile(recentlyOpened, 'utf8').then((str) => {
      this.setState({recent: JSON.parse(str)});
    }).catch((err) => {
      // file probably doesn't exist, no problem
      this.setState({recent: []});
    });
    Linking.getInitialURL().then(url => {
      this.parseURL(url);
      this.urlHandler = ({ url }) => {
        this.parseURL(url);
      };
      Linking.addEventListener("url", this.urlHandler);
    });
    this.withInfo = connectionInfo => {
      var online, ref1;
      online = (ref1 = connectionInfo.type) !== "none" && ref1 !== "NONE";
      this.setState({ online }, () => {
        if (online) {
          this.login();
        } else if (this.state.auth == null) {
          new Auth().loadSavedAuth(authToken => {
            this.setState({
              auth: Object.assign(new Auth(), { authToken })
            }, () => {
              this.updateFollowed();
            });
          });
        }
      });
    };
    NetInfo.getConnectionInfo().then(this.withInfo);
    NetInfo.addEventListener("connectionChange", this.withInfo);
    this.withAppState = appState => {
      if (appState !== "active") {
        this.setState({
          aris: false
        });
      }
    };
    AppState.addEventListener("change", this.withAppState);
    if (this.props.viola) {
      this.hardwareBack = () => {
        this.props.backToViola();
        return true;
      };
      BackHandler.addEventListener(
        "hardwareBackPress",
        this.hardwareBack
      );
    }
    Permissions.request('location').then(response => {
      if (response === 'authorized') {
        this.watchID = navigator.geolocation.watchPosition((loc) => {
          this.setState({location: loc});
        }, (err) => {
          // do nothing; we need to pass this to avoid
          // https://github.com/facebook/react-native/issues/9490#issuecomment-271974881
        }, {
          enableHighAccuracy: true,
          maximumAge: 0,
          distanceFilter: 0,
          useSignificantChanges: false,
        });
      }
    });
    Orientation.lockToPortrait();
  },
  componentWillUnmount: function() {
    NetInfo.removeEventListener("connectionChange", this.withInfo);
    Linking.removeEventListener("url", this.urlHandler);
    AppState.removeEventListener("change", this.withAppState);
    if (this.hardwareBack != null) {
      BackHandler.removeEventListener(
        "hardwareBackPress",
        this.hardwareBack
      );
    }
    if (this.watchID) {
      navigator.geolocation.clearWatch(this.watchID);
    }
    Orientation.unlockAllOrientations();
  },
  parseURL: function(url) {
    var auth,
      i,
      k,
      kv,
      len,
      mapping,
      parsed,
      ref1,
      ref2,
      siftr_id,
      siftr_url,
      v;
    if (!url) {
      this.setState({
        aris: false
      });
      return;
    }
    mapping = {};
    parsed = parseUri(url);
    if (parsed.protocol === "siftr") {
      ref1 = parsed.query.split("&");
      for (i = 0, len = ref1.length; i < len; i++) {
        kv = ref1[i];
        [k, v] = kv.split("=");
        mapping[k] = v;
      }
      siftr_id = parseInt(mapping.siftr_id);
      if (siftr_id) {
        this.launchByID({
          aris: parseInt(mapping.aris) ? true : false,
          siftr_id: siftr_id,
          nomen_id: parseInt(mapping.nomen_id),
          species_id: decodeURIComponent(
            (mapping.species_id + "").replace(/\+/g, "%20")
          )
        });
      }
    } else if (parsed.host === "siftr.org") {
      siftr_id = 0;
      siftr_url = parsed.query;
      if (siftr_url.length === 0 || siftr_url.match(/aris=1/)) {
        siftr_url = parsed.path.replace(/\//g, "");
      }
      if (!siftr_url.match(/[^0-9]/)) {
        siftr_id = parseInt(siftr_url);
        siftr_url = null;
      }
      auth = (ref2 = this.state.auth) != null ? ref2 : new Auth();
      if (siftr_url != null) {
        auth.searchSiftrs(
          {
            siftr_url: siftr_url
          },
          withSuccess(games => {
            if (games.length === 1) {
              this.setState({
                game: games[0]
              });
            }
          })
        );
      } else if (siftr_id) {
        auth.getGame(
          {
            game_id: siftr_id
          },
          withSuccess(game => {
            if (game != null) {
              this.setState({
                game: games[0]
              });
            }
          })
        );
      }
    }
  },
  launchByID: function({ aris, siftr_id, nomen_id, species_id, saved_note }) {
    var ref1, ref2;
    if (
      ((ref1 = this.state.game) != null ? ref1.game_id : undefined) === siftr_id
    ) {
      return;
    }
    ((ref2 = this.state.auth) != null ? ref2 : new Auth()).getGame(
      {
        game_id: siftr_id
      },
      withSuccess(game => {
        this.setState({
          game: game,
          aris: aris,
          saved_note: saved_note,
          nomenData: nomen_id ? { nomen_id, species_id } : undefined
        });
      })
    );
  },
  clearNomenData: function() {
    this.setState({
      nomenData: null,
      saved_note: null
    });
  },
  componentDidUpdate: function() {
    if ( this.state.game != null
      && this.state.recent != null
      && this.state.recent[0] !== this.state.game.game_id
    ) {
      const newRecent = [this.state.game.game_id].concat(
        this.state.recent.filter((x) => x !== this.state.game.game_id)
      );
      this.setState({recent: newRecent}, () => {
        RNFS.writeFile(recentlyOpened, JSON.stringify(newRecent), 'utf8');
      });
    }
  },
  // @endif
  updateGames: function() {
    this.state.auth.getGamesForUser(
      {order: 'recent'},
      withSuccess(games => {
        this.setState({
          games: games.filter((game) => game.is_siftr)
        });
      })
    );
  },
  updateFollowed: function() {
    // @ifdef NATIVE
    const storeFollowed = `${RNFS.DocumentDirectoryPath}/siftrs/followed.txt`;
    if (this.state.online) {
      const thisUpdate = this.lastUpdate = Date.now();
      const oldSiftrs = this.state.followed || [];
      this.state.auth.getFollowedGamesForUser(
        {order: 'recent'},
        withSuccess(games => {
          if (this.lastUpdate !== thisUpdate) return;
          const siftrs = games.filter((game) => game.is_siftr);
          RNFS.writeFile(
            `${RNFS.DocumentDirectoryPath}/siftrs/followed.txt`,
            JSON.stringify(siftrs)
          );
          this.setState({followed: siftrs});
          siftrs.forEach((game) => {
            if (!oldSiftrs.some((oldGame) => oldGame.game_id === game.game_id)) {
              downloadGame(this.state.auth, game);
            }
          });
        })
      );
    } else {
      RNFS.readFile(storeFollowed, 'utf8').then((str) => {
        const siftrs = JSON.parse(str).map(game => Object.assign(new Game(), game));
        this.setState({followed: siftrs});
      });
    }
    // @endif
  },
  followGame: function(game, cb) {
    this.state.auth.call(
      "games.followGame",
      {
        game_id: game.game_id
      },
      withSuccess(() => {
        if (cb) cb();
        this.updateFollowed();
      })
    );
  },
  unfollowGame: function(game, cb) {
    this.state.auth.call(
      "games.unfollowGame",
      {
        game_id: game.game_id
      },
      withSuccess(() => {
        if (cb) cb();
        this.updateFollowed();
      })
    );
  },
  // @ifdef WEB
  tryLoadGame: function(
    auth,
    game,
    password = (ref1 = auth.password) != null ? ref1 : game.password
  ) {
    auth.searchNotes(
      {
        game_id: game.game_id,
        note_count: 1,
        password: password
      },
      result => {
        var newPassword;
        if (result.returnCode === 0) {
          this.setState(
            {
              auth: update(auth, {
                password: {
                  $set: password
                }
              })
            },
            () => {
              this.loadGamePosition(game);
            }
          );
        } else {
          newPassword = prompt(
            password != null
              ? "Incorrect password."
              : "This Siftr requires a password to access."
          );
          if (newPassword != null) {
            this.tryLoadGame(auth, game, newPassword);
          }
        }
      }
    );
  },
  // @endif
  loadGamePosition: function(game, create = false) {
    if (game.type === "ANYWHERE" && this.state.online) {
      this.state.auth.call(
        "notes.siftrBounds",
        {
          game_id: game.game_id
        },
        withSuccess(bounds => {
          if (
            bounds.max_latitude != null &&
            bounds.min_longitude != null &&
            bounds.min_latitude != null &&
            bounds.max_longitude != null
          ) {
            bounds.max_latitude = parseFloat(bounds.max_latitude);
            bounds.min_longitude = parseFloat(bounds.min_longitude);
            bounds.min_latitude = parseFloat(bounds.min_latitude);
            bounds.max_longitude = parseFloat(bounds.max_longitude);
            this.setState({ game, bounds });
          } else {
            this.setState({
              game,
              createOnLaunch: create,
              bounds: null
            });
          }
        })
      );
    } else {
      this.setState({
        game,
        createOnLaunch: create,
        bounds: null
      });
    }
  },
  login: function(username, password) {
    var ref2;
    if (!this.state.online) {
      displayError({
        error: "Couldn't connect to Siftr."
      });
      return;
    }
    ((ref2 = this.state.auth) != null ? ref2 : new Auth()).login(
      username,
      password,
      (newAuth, err) => {
        var nomen_id, saved_note, siftr_id, siftr_url, species_id;
        if (username != null && password != null && newAuth.authToken == null) {
          displayError(err);
        }
        this.setState({
          auth: newAuth,
          games: null,
          followed: null
        });
        // @ifdef WEB
        siftr_id = 0;
        siftr_url = window.location.search.replace("?", "");
        if (siftr_url.length === 0 || siftr_url.match(/aris=1/)) {
          siftr_url = window.location.pathname.replace(/\//g, "");
        }
        if (!siftr_url.match(/[^0-9]/)) {
          siftr_id = parseInt(siftr_url);
          siftr_url = null;
        }
        if (siftr_url != null) {
          newAuth.searchSiftrs(
            {
              siftr_url: siftr_url
            },
            withSuccess(games => {
              if (games.length === 1) {
                this.tryLoadGame(newAuth, games[0]);
              }
            })
          );
        } else if (siftr_id) {
          newAuth.getGame(
            {
              game_id: siftr_id
            },
            withSuccess(game => {
              if (game != null) {
                this.tryLoadGame(newAuth, game);
              }
            })
          );
        }
        // @endif
        if (newAuth.authToken != null) {
          // @ifdef NATIVE
          firebase.analytics().logEvent("login", {
            username: newAuth.authToken.username,
            user_id: newAuth.authToken.user_id
          });
          // @endif
          if (this.state.online) {
            this.updateGames();
            this.updateFollowed();
            if (this.props.viola) {
              ({
                nomen_id,
                species_id,
                saved_note
              } = this.props.getViolaInfo());
              this.launchByID({
                siftr_id: this.props.siftr_id,
                nomen_id: nomen_id,
                species_id: species_id,
                saved_note: saved_note
              });
            }
          }
          this.setState({
            menuOpen: false
          });
        }
      }
    );
  },
  showTerms: function(username, password, email) {
    this.registerInfo = { username, password, email };
    this.setState({
      showingTerms: true
    });
  },
  registerNow: function(username, password, email) {
    this.registerInfo = { username, password, email };
    this.register();
  },
  register: function() {
    var email, password, ref2, username;
    if (!this.state.online) {
      displayError({
        error: "Couldn't connect to Siftr.",
        errorMore:
          "You need to be connected to the internet to create an account."
      });
      return;
    }
    ({ username, password, email } = this.registerInfo);
    ((ref2 = this.state.auth) != null ? ref2 : new Auth()).register(
      username,
      password,
      email,
      (newAuth, err) => {
        if (newAuth.authToken == null) {
          displayError(err);
        }
        this.setState({
          showingTerms: false,
          auth: newAuth,
          games: null,
          followed: null
        });
        if (newAuth.authToken != null) {
          if (this.state.online) {
            this.updateGames();
            this.updateFollowed();
          }
          this.setState({
            menuOpen: false
          });
        }
      }
    );
  },
  logout: function() {
    var ref2;
    ((ref2 = this.state.auth) != null ? ref2 : new Auth()).logout(
      newAuth => {
        this.setState({
          auth: newAuth,
          menuOpen: false
        });
      }
    );
  },
  gameBelongsToUser: function(game) {
    var ref2;
    return (ref2 = this.state.games) != null
      ? ref2.some(userGame => {
          return userGame.game_id === game.game_id;
        })
      : undefined;
  },
  changePassword: function(args, cb) {
    var ref2;
    if (this.state.online) {
      ((ref2 = this.state.auth) != null
        ? ref2
        : new Auth()
      ).changePassword(args, (newAuth, err) => {
        if (newAuth.authToken) {
          this.setState({
            auth: newAuth
          });
          cb(true);
        } else {
          cb(false);
        }
      });
    } else {
      cb(false);
    }
  },
  editProfile: function(args, progress, cb) {
    var ref2;
    if (this.state.online) {
      ((ref2 = this.state.auth) != null ? ref2 : new Auth()).editProfile(
        args,
        progress,
        (newAuth, err) => {
          if (newAuth.authToken) {
            this.setState({
              auth: newAuth
            });
            cb(true);
          } else {
            cb(false);
          }
        }
      );
    } else {
      cb(false);
    }
  },

  // @ifdef NATIVE
  render: function() {
    if (this.state.auth != null) {
      return (
        <UploadQueue
          auth={this.state.auth}
          online={this.state.online}
          onMessage={queueMessage => {
            this.setState({ queueMessage });
          }}
          withPendingNotes={pendingNotes => {
            this.setState({ pendingNotes });
          }}
          onUpload={() => {
            if (this.siftrView) this.siftrView.loadAfterUpload();
          }}
        >
          {this.state.auth.authToken != null ? (
            this.state.game != null ? (
              <SafeAreaView style={{flex: 1, backgroundColor: 'white'}}>
                <SiftrViewPW
                  game={this.state.game}
                  bounds={this.state.bounds}
                  auth={this.state.auth}
                  isAdmin={this.gameBelongsToUser(this.state.game)}
                  aris={this.state.aris}
                  location={this.state.location}
                  onExit={() => {
                    if (this.state.aris) {
                      if (Platform.OS === "android") {
                        BackHandler.exitApp(); // Linking.openURL "ARIS://"
                      } else {
                        return;
                      }
                    } else if (this.props.viola) {
                      this.props.backToViola();
                    } else {
                      this.setState({
                        game: null,
                        aris: false
                      });
                    }
                  }}
                  onPromptLogin={() => {
                    this.setState({
                      menuOpen: true
                    });
                  }}
                  nomenData={this.state.nomenData}
                  clearNomenData={this.clearNomenData}
                  createOnLaunch={this.state.createOnLaunch}
                  clearCreate={() => this.setState({createOnLaunch: false})}
                  online={this.state.online}
                  followed={this.state.followed}
                  followGame={this.followGame}
                  unfollowGame={this.unfollowGame}
                  queueMessage={this.state.queueMessage}
                  viola={this.props.viola}
                  onViolaIdentify={this.props.onViolaIdentify}
                  onLogout={this.logout}
                  onChangePassword={this.changePassword}
                  onEditProfile={this.editProfile}
                  saved_note={this.state.saved_note}
                  pendingNotes={this.state.pendingNotes}
                  ref={ref => {
                    this.siftrView = ref;
                  }}
                />
              </SafeAreaView>
            ) : (
              <SafeAreaView style={{flex: 1, backgroundColor: 'white'}}>
                <NativeHome
                  auth={this.state.auth}
                  onLogout={this.logout}
                  onSelect={(game, create = false) => {
                    this.loadGamePosition(game, create);
                  }}
                  online={this.state.online}
                  mine={this.state.games}
                  followed={this.state.followed}
                  followGame={this.followGame}
                  unfollowGame={this.unfollowGame}
                  onChangePassword={this.changePassword}
                  onEditProfile={this.editProfile}
                  queueMessage={this.state.queueMessage}
                  setScreen={o => {
                    this.setState(o);
                  }}
                  discoverPage={this.state.discoverPage}
                  settings={this.state.settings}
                  screen={this.state.screen}
                  recent={this.state.recent || []}
                />
              </SafeAreaView>
            )
          ) : this.state.showingTerms ? (
            <Terms
              onAccept={() => {
                this.register();
              }}
              onCancel={() => {
                this.setState({
                  showingTerms: false
                });
              }}
            />
          ) : (
            <NativeLogin
              onLogin={this.login}
              onRegister={this.showTerms}
              viola={this.props.viola}
              backToViola={this.props.backToViola}
              online={this.state.online}
            />
          )}
        </UploadQueue>
      );
    } else {
      return <Loading queueMessage={this.state.queueMessage} />;
    }
  },
  // @endif

  // @ifdef WEB
  render: function() {
    if (this.state.auth != null) {
      return (
        <WebNav
          auth={this.state.auth}
          onLogin={this.login}
          onRegister={this.registerNow}
          onLogout={this.logout}
          hasBrowserButton={this.state.game != null}
          onBrowserButton={() => {
            this.setState({
              game: null
            });
          }}
          onMenuMove={b => {
            this.setState({
              menuOpen: b
            });
          }}
          menuOpen={this.state.menuOpen}
          online={this.state.online}
        >
          {this.state.game != null ? (
            <SiftrView
              game={this.state.game}
              auth={this.state.auth}
              isAdmin={this.gameBelongsToUser(this.state.game)}
              onExit={() => {
                this.setState({
                  game: null,
                  password: null
                });
              }}
              onPromptLogin={() => {
                this.setState({
                  menuOpen: true
                });
              }}
              nomenData={this.state.nomenData}
              clearNomenData={this.clearNomenData}
              online={this.state.online}
              followed={this.state.followed}
              followGame={this.followGame}
              unfollowGame={this.unfollowGame}
              bounds={this.state.bounds}
            />
          ) : (
            undefined
          )}
        </WebNav>
      );
    } else {
      return <p>Loading...</p>;
    }
  },
  // @endif

});

'use strict'

React = require 'react'
T = React.PropTypes

# @ifdef NATIVE
{ Text
, View
, TextInput
, TouchableOpacity
, ScrollView
, Platform
, StatusBar
, Image
, Linking
, NetInfo
} = require 'react-native'
{UploadQueue} = require './upload-queue'
{styles} = require './styles'
SideMenu = require 'react-native-side-menu'
Orientation = require 'react-native-orientation'
# @endif

{ Auth
, Game
, arisHTTPS
} = require './aris'

{SiftrView} = require './siftr-view'
{GameList, SiftrURL} = require './siftr-browser'

{clicker, withSuccess, DIV, P, BUTTON} = require './utils'

{parseUri} = require './parse-uri'

AuthContainer = React.createClass
  propTypes:
    auth: T.instanceOf(Auth).isRequired
    onLogin: T.func
    onLogout: T.func
    hasBrowserButton: T.bool
    onBrowserButton: T.func
    menuOpen: T.bool
    onMenuMove: T.func
    online: T.bool

  getDefaultProps: ->
    onLogin: (->)
    onLogout: (->)
    hasBrowserButton: false
    onBrowserButton: (->)
    menuOpen: false
    onMenuMove: (->)

  getInitialState: ->
    hasBrowserButton: false
    onBrowserButton: (->)
    userPicture: null

  goBackToBrowser: ->
    @props.onMenuMove false
    @props.onBrowserButton()

  componentWillMount: ->
    @fetchPicture()

  componentWillReceiveProps: (nextProps) ->
    if @props.auth isnt nextProps.auth
      @fetchPicture nextProps.auth

  fetchPicture: (auth = @props.auth) ->
    media_id = auth.authToken?.media_id
    unless media_id?
      @setState userPicture: null
      return
    if @props.online
      @props.auth.call 'media.getMedia',
        media_id: media_id
      , withSuccess (userPicture) =>
        @setState {userPicture}

  # @ifdef NATIVE
  render: ->
    <SideMenu
      isOpen={@props.menuOpen}
      onChange={@props.onMenuMove}
      edgeHitWidth={0}
      menu={
        <View style={backgroundColor: '#224', paddingTop: 30, flex: 1}>
          {
            if @props.auth.authToken?
              <View style={
                flexDirection: 'column'
                justifyContent: 'flex-start'
                alignItems: 'center'
              }>
                {
                  <Image
                    source={uri: arisHTTPS @state.userPicture?.big_thumb_url}
                    resizeMode="cover"
                    style={
                      height: 130
                      width: 130
                      backgroundColor: '#ccd'
                      margin: 10
                      borderRadius: 65
                    }
                  />
                }
                <Text style={textAlign: 'center', color: 'white', fontSize: 18}>
                  {@props.auth.authToken.display_name}
                </Text>
                <TouchableOpacity onPress={@props.onLogout}>
                  <Text style={[styles.blueButton, margin: 10]}>
                    Logout
                  </Text>
                </TouchableOpacity>
              </View>
            else
              <LoginBox onLogin={@props.onLogin} />
          }
          {
            if @props.hasBrowserButton
              <TouchableOpacity onPress={@goBackToBrowser} style={
                flexDirection: 'column'
                justifyContent: 'flex-start'
                alignItems: 'center'
              }>
                <Text style={[styles.blueButton, margin: 10]}>
                  Back to Browser
                </Text>
              </TouchableOpacity>
          }
        </View>
      }
    >
      <View style={flex: 1, flexDirection: 'column'}>
        <StatusSpace
          backgroundColor="#224"
          barStyle="light-content"
        />
        <View style={
          backgroundColor: '#224'
          flexDirection: 'row'
          alignItems: 'center'
          justifyContent: 'flex-start'
        }>
          <TouchableOpacity
            onPress={=> @props.onMenuMove not @props.menuOpen}
            style={
              marginLeft: 10
            }
          >
            <Image source={require '../web/assets/img/menu.png'} />
          </TouchableOpacity>
          <Text style={
            color: 'white'
            margin: 10
          }>
            {
              if @props.online
                if @props.auth.authToken?
                  "Logged in as #{@props.auth.authToken.display_name}"
                else
                  "Log in"
              else
                if @props.auth.authToken?
                  "Logged in as #{@props.auth.authToken.display_name} (offline)"
                else
                  "Offline"
            }
          </Text>
        </View>
        {@props.children}
      </View>
    </SideMenu>
  # @endif

  # @ifdef WEB
  render: ->
    <div className={"auth-container #{if @props.menuOpen then 'auth-menu-open' else 'auth-menu-closed'}"}>
      <div className="auth-nav">
        <a href="#"
          onClick={clicker => @props.onMenuMove not @props.menuOpen}
          className="auth-nav-button"
        ><img src="assets/img/menu.png" /></a>
        <span>
        {
          if @props.auth.authToken?
            " Logged in as #{@props.auth.authToken.display_name}"
          else
            " Log in"
        }
        </span>
      </div>
      <div className="auth-contents">
        {@props.children}
      </div>
      <div className="auth-menu">
        {
          if @props.auth.authToken?
            <div>
              <div className="auth-menu-user-picture" style={
                backgroundImage:
                  if (url = @state.userPicture?.big_thumb_url)
                    "url(#{arisHTTPS url})"
              } />
              <p>
                {@props.auth.authToken.display_name}
              </p>
              <p>
                <button type="button" onClick={@props.onLogout}>Logout</button>
              </p>
            </div>
          else
            <LoginBox onLogin={@props.onLogin} />
        }
        {
          if @props.hasBrowserButton
            <p>
              <button type="button" onClick={@goBackToBrowser}>Back to Browser</button>
            </p>
        }
      </div>
    </div>
  # @endif

LoginBox = React.createClass
  propTypes:
    onLogin: T.func

  doLogin: ->
    if @props.onLogin?
      # @ifdef NATIVE
      @props.onLogin @username, @password
      # @endif
      # @ifdef WEB
      @props.onLogin @refs.username.value, @refs.password.value
      # @endif

  handleEnter: (e) ->
    @doLogin() if e.keyCode is 13

  # @ifdef NATIVE
  render: ->
    <View>
      <TextInput
        placeholder="Username"
        style={styles.input}
        autoCapitalize="none"
        autoCorrect={false}
        autoFocus={true}
        onChangeText={(username) => @username = username}
      />
      <TextInput
        placeholder="Password"
        secureTextEntry={true}
        style={styles.input}
        autoCapitalize="none"
        autoCorrect={false}
        onChangeText={(password) => @password = password}
      />
      <TouchableOpacity onPress={@doLogin}>
        <Text style={[styles.blueButton, margin: 10]}>Login</Text>
      </TouchableOpacity>
    </View>
  # @endif

  # @ifdef WEB
  render: ->
    <form>
      <p>
        <input
          placeholder="Username"
          type="text"
          ref="username"
          onKeyDown={@handleEnter}
          className="login-field"
        />
      </p>
      <p>
        <input
          placeholder="Password"
          type="password"
          ref="password"
          onKeyDown={@handleEnter}
          className="login-field"
        />
      </p>
      <p>
        <button type="button" onClick={clicker @doLogin}>Login</button>
      </p>
    </form>
  # @endif

Loading = React.createClass
  # @ifdef NATIVE
  render: ->
    <View>
      <StatusSpace />
      <Text>Loading...</Text>
    </View>
  # @endif
  # @ifdef WEB
  render: ->
    <p>Loading...</p>
  # @endif

# @ifdef NATIVE
StatusSpace = React.createClass
  getInitialState: ->
    orientation: 'PORTRAIT'

  componentDidMount: ->
    # TODO something's not linked right with orientation on android.
    # we don't need it anyway, but for now just don't set it up
    if Platform.OS is 'ios'
      Orientation.getSpecificOrientation (err, orientation) =>
        @setState {orientation}
      @orientationListener = (orientation) =>
        @setState {orientation}
      Orientation.addSpecificOrientationListener @orientationListener

  componentWillUnmount: ->
    if Platform.OS is 'ios'
      Orientation.removeSpecificOrientationListener @orientationListener

  render: ->
    <View style={
      flex: 0
      height:
        if Platform.OS is 'ios' and @state.orientation is 'PORTRAIT'
          20
        else
          undefined
      backgroundColor: @props.backgroundColor ? 'white'
    }>
      <StatusBar
        backgroundColor={@props.backgroundColor ? 'white'}
        barStyle={@props.barStyle ? 'dark-content'}
      />
    </View>
# @endif
# @ifdef WEB
StatusSpace = React.createClass
  render: -> null
# @endif

# @ifdef NATIVE
NativeLogin = React.createClass
  getDefaultProps: ->
    onLogin: (->)

  getInitialState: ->
    page: 'sign-in'

  doLogin: ->
    @props.onLogin @username, @password

  componentWillMount: ->
    @username = ''
    @password = ''

  render: ->
    <View style={
      flex: 1
      flexDirection: 'column'
    }>
      <View style={
        flex: 1
        flexDirection: 'column'
        backgroundColor: 'green'
        alignItems: 'center'
        justifyContent: 'space-between'
      }>
        <View />
        <Text>Siftr</Text>
        <Text>Exploring our world together</Text>
        <View style={
          flexDirection: 'row'
          alignItems: 'flex-end'
          justifyContent: 'space-around'
          alignSelf: 'stretch'
        }>
          <TouchableOpacity style={padding: 20} onPress={=> @setState page: 'sign-in'}>
            <Text>Sign In</Text>
          </TouchableOpacity>
          <TouchableOpacity style={padding: 20} onPress={=> @setState page: 'sign-up'}>
            <Text>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </View>
      {
        switch @state.page
          when 'sign-in'
            <View style={
              flex: 1
              flexDirection: 'column'
            }>
              <View style={
                flex: 1
                justifyContent: 'center'
                alignItems: 'center'
              }>
                <TextInput
                  placeholder="Username"
                  style={styles.input}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoFocus={true}
                  onChangeText={(username) => @username = username}
                  defaultValue={@username}
                />
                <TextInput
                  placeholder="Password"
                  secureTextEntry={true}
                  style={styles.input}
                  autoCapitalize="none"
                  autoCorrect={false}
                  onChangeText={(password) => @password = password}
                  defaultValue={@password}
                />
              </View>
              <TouchableOpacity onPress={@doLogin} style={
                backgroundColor: 'rgb(255,124,107)'
                alignItems: 'center'
                justifyContent: 'center'
                paddingTop: 20
                paddingBottom: 20
              }>
                <Text style={color: 'white'}>Log in</Text>
              </TouchableOpacity>
            </View>
          when 'sign-up'
            <View style={flex: 1} />
      }
    </View>

NativeBrowser = React.createClass
  getInitialState: ->
    discoverPage: 'siftrs'

  getDefaultProps: ->
    onLogout: (->)
    onSelect: (->)

  render: ->
    <View style={
      flexDirection: 'column'
      flex: 1
    }>
      <StatusSpace />
      <View style={
        flexDirection: 'row'
        justifyContent: 'space-between'
        alignItems: 'center'
      }>
        <TouchableOpacity style={padding: 10} onPress={@props.onLogout}>
          <Image style={resizeMode: 'contain', height: 18} source={require('../web/assets/img/icon-back.png')} />
        </TouchableOpacity>
        <Text>Discover</Text>
        <TouchableOpacity style={padding: 10}>
          <Image style={resizeMode: 'contain', height: 20} source={require('../web/assets/img/icon-search.png')} />
        </TouchableOpacity>
      </View>
      <View style={flexDirection: 'row'}>
        <TouchableOpacity onPress={=> @setState discoverPage: 'siftrs'} style={
          flex: 1
          alignItems: 'center'
          justifyContent: 'center'
          borderBottomWidth: 2
          borderBottomColor: if @state.discoverPage is 'siftrs' then '#FF7C6B' else '#B8B8B8'
          paddingTop: 13
          paddingBottom: 13
        }>
          <Text style={
            color: if @state.discoverPage is 'siftrs' then 'black' else '#B8B8B8'
          }>Siftrs</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={=> @setState discoverPage: 'people'} style={
          flex: 1
          alignItems: 'center'
          justifyContent: 'center'
          borderBottomWidth: 2
          borderBottomColor: if @state.discoverPage is 'people' then '#FF7C6B' else '#B8B8B8'
          paddingTop: 13
          paddingBottom: 13
        }>
          <Text style={
            color: if @state.discoverPage is 'people' then 'black' else '#B8B8B8'
          }>People</Text>
        </TouchableOpacity>
      </View>
      {
        switch @state.discoverPage
          when 'siftrs'
            <ScrollView contentContainerStyle={flex: 1}>
              {
                if @props.games?
                  @props.games.map (game) =>
                    <TouchableOpacity key={game.game_id} onPress={=> @props.onSelect game}>
                      <View style={styles.openSiftrButton}>
                        <Text style={margin: 5}>
                          {game.name}
                        </Text>
                      </View>
                    </TouchableOpacity>
                else
                  <Text>Loading...</Text>
              }
            </ScrollView>
          when 'people'
            <ScrollView contentContainerStyle={flex: 1}>
              <Text>Person 1</Text>
              <Text>Person 2</Text>
            </ScrollView>
      }
      <View style={
        flexDirection: 'row'
        justifyContent: 'space-between'
        alignItems: 'center'
      }>
        <TouchableOpacity style={padding: 10}>
          <Image style={resizeMode: 'contain', height: 30} source={require('../web/assets/img/icon-home.png')} />
        </TouchableOpacity>
        <TouchableOpacity style={padding: 10}>
          <Image style={resizeMode: 'contain', height: 30} source={require('../web/assets/img/icon-add.png')} />
        </TouchableOpacity>
        <TouchableOpacity style={padding: 10}>
          <Image style={resizeMode: 'contain', height: 30} source={require('../web/assets/img/icon-user.png')} />
        </TouchableOpacity>
      </View>
    </View>
# @endif

SiftrNative = React.createClass
  getInitialState: ->
    auth: null
    games: null
    game: null
    menuOpen: false
    online: true

  # @ifdef WEB
  componentWillMount: ->
    @login()
  # @endif

  # @ifdef NATIVE
  componentDidMount: ->
    Linking.getInitialURL().then (url) =>
      @parseURL(url) if url
      @urlHandler = ({url}) => @parseURL(url)
      Linking.addEventListener 'url', @urlHandler
    @withReach = (reach) =>
      online = reach not in ['none', 'NONE']
      @setState {online}, =>
        if online
          @login()
        else if not @state.auth?
          new Auth().loadSavedAuth (authToken) =>
            @setState auth: Object.assign new Auth, {authToken}
    NetInfo.fetch().done @withReach
    NetInfo.addEventListener 'change', @withReach

  componentWillUnmount: ->
    NetInfo.removeEventListener 'change', @withReach
    Linking.removeEventListener 'url', @urlHandler

  parseURL: (url) ->
    mapping = {}
    for kv in parseUri(url).query.split('&')
      [k, v] = kv.split('=')
      mapping[k] = v
    siftr_id = parseInt(mapping.siftr_id)
    nomen_id = parseInt(mapping.nomen_id)
    species_id = decodeURIComponent((mapping.species_id+'').replace(/\+/g, '%20'))
    if siftr_id
      @launchByID {siftr_id, nomen_id, species_id}

  launchByID: ({siftr_id, nomen_id, species_id}) ->
    return if @state.game?.game_id is siftr_id
    (@state.auth ? new Auth).getGame
      game_id: siftr_id
    , withSuccess (game) =>
      @setState
        game: game
        nomenData: {nomen_id, species_id}

  clearNomenData: ->
    @setState nomenData: null
  # @endif

  updateGames: ->
    @state.auth.getGamesForUser {}, withSuccess (games) =>
      @setState games:
        game for game in games when game.is_siftr

  login: (username, password) ->
    return unless @state.online
    (@state.auth ? new Auth).login username, password, (newAuth, err) =>
      if username? and password? and not newAuth.authToken?
        console.warn err
      @setState
        auth: newAuth
        games: null
      if newAuth.authToken?
        @updateGames() if @state.online
        @setState menuOpen: false

  logout: ->
    (@state.auth ? new Auth).logout (newAuth) =>
      @setState
        auth: newAuth
        menuOpen: false

  gameBelongsToUser: (game) ->
    @state.games?.some (userGame) => userGame.game_id is game.game_id

  # @ifdef NATIVE
  render: ->
    if @state.auth?
      if @state.auth.authToken?
        <NativeBrowser
          onLogout={@logout}
          games={@state.games}
          onSelect={(game) => @setState {game}}
          online={@state.online}
        />
      else
        <NativeLogin onLogin={@login} />
    else
      <Loading />
  # @endif

  # @ifdef WEB
  render: ->
    if @state.auth?
      <AuthContainer
        auth={@state.auth} onLogin={@login} onLogout={@logout}
        hasBrowserButton={@state.game?}
        onBrowserButton={=> @setState game: null}
        onMenuMove={(b) => @setState menuOpen: b}
        menuOpen={@state.menuOpen}
        online={@state.online}
      >
        {
          if @state.game?
            <SiftrView
              game={@state.game}
              auth={@state.auth}
              isAdmin={@gameBelongsToUser @state.game}
              onExit={=> @setState game: null}
              onPromptLogin={=> @setState menuOpen: true}
              nomenData={@state.nomenData}
              clearNomenData={@clearNomenData}
              online={@state.online}
            />
        }
        {
          unless @state.game?
            <GameList games={
              if @state.auth.authToken?
                @state.games
              else
                []
            } onSelect={(game) => @setState {game}} online={@state.online} />
        }
        {
          unless @state.game?
            <SiftrURL auth={@state.auth} onSelect={(game) => @setState {game}} />
        }
        {
          # @ifdef NATIVE
          <UploadQueue auth={@state.auth} online={@state.online} />
          # @endif
          # @ifdef WEB
          null
          # @endif
        }
      </AuthContainer>
    else
      <Loading />
  # @endif

exports.SiftrNative = SiftrNative

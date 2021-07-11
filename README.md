# MicrosoftTeamsClone
Video Chat App using SimplePeer and Socket.io

https://powerful-forest-15838.herokuapp.com/

● After joining the room, the user sends a signal (join room) to the server.

● In response, the server provides a list of all peers in that room.

● After receiving the “all users” signal, the user creates a new Simple peer
for each of the room users and add them to the “peers” array.
(Simple Peer is a library for implementing WebRTC)

● Each peer created takes the stream and some configuration options, and
then the user sends the signal data to the server. That data consists of the
user’s socket id, peer’s id, and user’s signal data, which altogether forms
the payload object.

● After receiving the payload, the server sends that data to the respective
peer through the event named “user joined”.

● After receiving the “user joined” event, the peer will add the new user to its
list and send its signal data to the server using the “returning signal” event.

● The server then emits this data to the userID provided in the event
“returning signal”, i.e. back to the user, and the connection is established
between the peer and the user.

● After establishing the connection, the user just listens to the event “stream”
of each peer, which is emitted when the user receives a remote stream,
then the user adds this stream as a new video on our page, and now the
user can talk to the room peers.

Note: It's Very Important to send the signal data from each peer’s “signal” event to establish the
connection.

Note: Saving all peers and their id is important as they are needed in functionality like toggling
the video or audio tracks and many more

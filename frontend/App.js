import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, Button, FlatList, StyleSheet } from 'react-native';
import Toast from 'react-native-toast-message';
import io from 'socket.io-client';

const SERVER_URL = 'https://your-goroda-server.onrender.com';

const socket = io(SERVER_URL);

export default function App() {
  const [screen, setScreen] = useState('main');
  const [roomId, setRoomId] = useState('');
  const [playerId, setPlayerId] = useState(null);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState([]);
  const [nextTurn, setNextTurn] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const flatListRef = useRef();

  useEffect(() => {
    socket.on('game-start', () => setGameStarted(true));
    socket.on('move', ({ city, playerId, nextTurn }) => {
      setHistory(prev => [...prev, { player: playerId, city }]);
      setNextTurn(nextTurn);
      flatListRef.current?.scrollToEnd();
    });
    socket.on('error', (msg) => Toast.show({ type: 'error', text1: msg }));
    return () => {
      socket.off('game-start');
      socket.off('move');
      socket.off('error');
    };
  }, []);

  const createRoom = () => {
    socket.emit('create-room', ({ roomId, playerId }) => {
      setRoomId(roomId);
      setPlayerId(playerId);
      setScreen('game');
    });
  };

  const joinRoom = () => {
    socket.emit('join-room', { roomId }, (res) => {
      if (res.error) Toast.show({ type: 'error', text1: res.error });
      else {
        setPlayerId(res.playerId);
        setScreen('game');
      }
    });
  };

  const sendMove = () => {
    if (history.length > 0 && nextTurn !== playerId) {
      Toast.show({ type: 'error', text1: 'Сейчас ход соперника' });
      return;
    }
    socket.emit('make-move', { roomId, city: input, playerId });
    setInput('');
  };

  if (screen === 'main') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>🌍 Города</Text>
        <Button title="Играть с другом онлайн" onPress={() => setScreen('create')} />
      </View>
    );
  }

  if (screen === 'create') {
    return (
      <View style={styles.container}>
        <Button title="Создать комнату" onPress={createRoom} />
        <Text style={{ marginVertical: 20 }}>ИЛИ</Text>
        <TextInput
          placeholder="ID комнаты"
          value={roomId}
          onChangeText={setRoomId}
          style={styles.input}
        />
        <Button title="Присоединиться" onPress={joinRoom} />
      </View>
    );
  }

  if (screen === 'game') {
    return (
      <View style={styles.container}>
        <Text style={styles.roomId}>Комната: {roomId}</Text>
        {gameStarted && <Text style={styles.turn}>Ход: {nextTurn === playerId ? 'Ваш' : 'Соперника'}</Text>}
        <FlatList
          ref={flatListRef}
          data={history}
          inverted
          renderItem={({ item }) => (
            <View style={item.player === playerId ? styles.myMove : styles.opponentMove}>
              <Text>{item.city}</Text>
            </View>
          )}
          keyExtractor={(item, i) => i.toString()}
          style={{ width: '100%', marginVertical: 10 }}
        />
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Город..."
          style={styles.input}
          editable={gameStarted && (history.length === 0 || nextTurn === playerId)}
        />
        <Button title="Отправить" onPress={sendMove} />
        <Toast />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#f5f7fa' },
  title: { fontSize: 32, fontWeight: 'bold', marginBottom: 40, color: '#4361ee' },
  input: { borderWidth: 1, padding: 12, borderRadius: 8, width: '100%', marginVertical: 10 },
  roomId: { fontSize: 18, fontWeight: '600', marginBottom: 10 },
  turn: { fontSize: 16, color: '#555', marginBottom: 10 },
  myMove: { alignSelf: 'flex-end', backgroundColor: '#4361ee', padding: 10, borderRadius: 12, margin: 4, maxWidth: '70%' },
  opponentMove: { alignSelf: 'flex-start', backgroundColor: '#e9ecef', padding: 10, borderRadius: 12, margin: 4, maxWidth: '70%' }
});

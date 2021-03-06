/**
 * Sample BLE React Native App
 *
 * @format
 * @flow strict-local
 */
//12345689
import React, {useState, useEffect} from 'react';
import {Buffer} from 'buffer';
import {TextDecoder} from 'text-decoding';
import {stringToBytes} from 'convert-string';
import {
  SafeAreaView,
  StyleSheet,
  ScrollView,
  View,
  Text,
  StatusBar,
  NativeModules,
  NativeEventEmitter,
  Button,
  Platform,
  PermissionsAndroid,
  FlatList,
  TouchableHighlight,
} from 'react-native';

import {Colors} from 'react-native/Libraries/NewAppScreen';

import BleManager from 'react-native-ble-manager';
const BleManagerModule = NativeModules.BleManager;
const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);

const App = () => {
  const [isScanning, setIsScanning] = useState(false);
  const peripherals = new Map();
  const [list, setList] = useState([]);
  const [data, setData] = useState('');

  const startScan = () => {
    if (!isScanning) {
      BleManager.scan(['4fafc201-1fb5-459e-8fcc-c5c9c331914b'], 3, true)
        .then((results) => {
          console.log(results);
          console.log('Scanning...');
          setIsScanning(true);
        })
        .catch((err) => {
          console.error(err);
        });
    }
  };

  const handleStopScan = () => {
    console.log('Scan is stopped');
    setIsScanning(false);
  };

  const handleDisconnectedPeripheral = (data) => {
    let peripheral = peripherals.get(data.peripheral);
    if (peripheral) {
      peripheral.connected = false;
      peripherals.set(peripheral.id, peripheral);
      setList(Array.from(peripherals.values()));
    }
    console.log('Disconnected from ' + data.peripheral);
  };

  const handleUpdateValueForCharacteristic = (data) => {
    console.log(
      'Received data from ' +
        data.peripheral +
        ' characteristic ' +
        data.characteristic,
      data.value,
    );
  };

  const retrieveConnected = () => {
    BleManager.getConnectedPeripherals([]).then((results) => {
      if (results.length == 0) {
        console.log('No connected peripherals');
      }
      console.log(results);
      for (var i = 0; i < results.length; i++) {
        var peripheral = results[i];
        peripheral.connected = true;
        peripherals.set(peripheral.id, peripheral);
        setList(Array.from(peripherals.values()));
      }
    });
  };

  const handleDiscoverPeripheral = (peripheral) => {
    console.log('Got ble peripheral', peripheral);
    if (!peripheral.name) {
      peripheral.name = 'NO NAME';
    }
    peripherals.set(peripheral.id, peripheral);
    setList(Array.from(peripherals.values()));
  };

  const testPeripheral = (peripheral) => {
    if (peripheral) {
      if (peripheral.connected) {
        BleManager.disconnect(peripheral.id);
      } else {
        BleManager.connect(peripheral.id)
          .then(() => {
            let p = peripherals.get(peripheral.id);
            if (p) {
              p.connected = true;
              peripherals.set(peripheral.id, p);
              setList(Array.from(peripherals.values()));
            }
            console.log('Connected to ' + peripheral.id);

            setTimeout(() => {
              /* Test read current RSSI value */
              BleManager.retrieveServices(peripheral.id).then(
                (peripheralData) => {
                  console.log('Retrieved peripheral services', peripheralData);

                  BleManager.readRSSI(peripheral.id).then((rssi) => {
                    console.log('Retrieved actual RSSI value', rssi);
                    let p = peripherals.get(peripheral.id);
                    if (p) {
                      p.rssi = rssi;
                      peripherals.set(peripheral.id, p);
                      setList(Array.from(peripherals.values()));
                    }
                  });
                },
              );

              // Test using bleno's pizza example
              // https://github.com/sandeepmistry/bleno/tree/master/examples/pizza
              /*
            BleManager.retrieveServices(peripheral.id).then((peripheralInfo) => {
              console.log(peripheralInfo);
              var service = '13333333-3333-3333-3333-333333333337';
              var bakeCharacteristic = '13333333-3333-3333-3333-333333330003';
              var crustCharacteristic = '13333333-3333-3333-3333-333333330001';
              setTimeout(() => {
                BleManager.startNotification(peripheral.id, service, bakeCharacteristic).then(() => {
                  console.log('Started notification on ' + peripheral.id);
                  setTimeout(() => {
                    BleManager.write(peripheral.id, service, crustCharacteristic, [0]).then(() => {
                      console.log('Writed NORMAL crust');
                      BleManager.write(peripheral.id, service, bakeCharacteristic, [1,95]).then(() => {
                        console.log('Writed 351 temperature, the pizza should be BAKED');
                        
                        //var PizzaBakeResult = {
                        //  HALF_BAKED: 0,
                        //  BAKED:      1,
                        //  CRISPY:     2,
                        //  BURNT:      3,
                        //  ON_FIRE:    4
                        //};
                      });
                    });
                  }, 500);
                }).catch((error) => {
                  console.log('Notification error', error);
                });
              }, 200);
            });*/
            }, 900);
          })
          .catch((error) => {
            console.log('Connection error', error);
          });
      }
    }
  };

  useEffect(() => {
    BleManager.start({showAlert: false});

    bleManagerEmitter.addListener(
      'BleManagerDiscoverPeripheral',
      handleDiscoverPeripheral,
    );
    bleManagerEmitter.addListener('BleManagerStopScan', handleStopScan);
    bleManagerEmitter.addListener(
      'BleManagerDisconnectPeripheral',
      handleDisconnectedPeripheral,
    );
    bleManagerEmitter.addListener(
      'BleManagerDidUpdateValueForCharacteristic',
      handleUpdateValueForCharacteristic,
    );

    if (Platform.OS === 'android' && Platform.Version >= 23) {
      PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ).then((result) => {
        if (result) {
          console.log('Permission is OK');
        } else {
          PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          ).then((result) => {
            if (result) {
              console.log('User accept');
            } else {
              console.log('User refuse');
            }
          });
        }
      });
    }

    return () => {
      console.log('unmount');
      bleManagerEmitter.removeEventListener(
        'BleManagerDiscoverPeripheral',
        handleDiscoverPeripheral,
      );
      bleManagerEmitter.removeEventListener(
        'BleManagerStopScan',
        handleStopScan,
      );
      bleManagerEmitter.removeEventListener(
        'BleManagerDisconnectPeripheral',
        handleDisconnectedPeripheral,
      );
      bleManagerEmitter.removeEventListener(
        'BleManagerDidUpdateValueForCharacteristic',
        handleUpdateValueForCharacteristic,
      );
    };
  }, []);
  const [flag, setFlag] = useState(false);
  useEffect(() => {
    if (flag) {
      console.log('GET DATA TURN ON');
      async function getDataFromServer() {
        const readChracteristic = await BleManager.read(
          '3C:71:BF:9D:EA:62',
          '4fafc201-1fb5-459e-8fcc-c5c9c331914b',
          'beb5483e-36e1-4688-b7f5-ea07361b26a8',
        );
        const utf8decoder = new TextDecoder('utf-8');
        const utf8Arr = new Uint8Array(readChracteristic);
        // return utf8decoder.decode(utf8Arr);
        // return (utf8decoder.decode(utf8Arr));

        setData(utf8decoder.decode(utf8Arr));
      }
      getDataFromServer();
    }
  });

  const renderItem = (item) => {
    const color = item.connected ? 'green' : '#fff';
    return (
      <TouchableHighlight onPress={() => testPeripheral(item)}>
        <View style={[styles.row, {backgroundColor: color}]}>
          <Text
            style={{
              fontSize: 12,
              textAlign: 'center',
              color: '#333333',
              padding: 10,
            }}>
            {item.name}
          </Text>
          <Text
            style={{
              fontSize: 10,
              textAlign: 'center',
              color: '#333333',
              padding: 2,
            }}>
            RSSI: {item.rssi}
          </Text>
          <Text
            style={{
              fontSize: 8,
              textAlign: 'center',
              color: '#333333',
              padding: 2,
              paddingBottom: 20,
            }}>
            {item.id}
          </Text>
        </View>
      </TouchableHighlight>
    );
  };
  const getDataFromServer = async () => {
    console.log(list);
    console.log('GET DATA');
    setFlag(true);
    const readChracteristic = await BleManager.read(
      '3C:71:BF:9D:EA:62',
      '4fafc201-1fb5-459e-8fcc-c5c9c331914b',
      'beb5483e-36e1-4688-b7f5-ea07361b26a8',
    );
    const utf8decoder = new TextDecoder('utf-8');
    const utf8Arr = new Uint8Array(readChracteristic);
    // return utf8decoder.decode(utf8Arr);
    return utf8decoder.decode(utf8Arr);
  };
  const turnOff = async () => {
    console.log('TURN OFF');
    const data = stringToBytes('OFF\n');
    const writeChracteristic = await BleManager.write(
      '3C:71:BF:9D:EA:62',
      '4fafc201-1fb5-459e-8fcc-c5c9c331914b',
      'beb5483e-36e1-4688-b7f5-ea07361b26a8',
      data,
    );
  };
  const turnOn = async () => {
    console.log('TURN ON');
    const data = stringToBytes('ON\n');
    const writeChracteristic = await BleManager.write(
      '3C:71:BF:9D:EA:62',
      '4fafc201-1fb5-459e-8fcc-c5c9c331914b',
      'beb5483e-36e1-4688-b7f5-ea07361b26a8',
      data,
    );
  };
  return (
    <SafeAreaView>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={styles.scrollView}>
        {global.HermesInternal == null ? null : (
          <View style={styles.engine}>
            <Text style={styles.footer}>Engine: Hermes</Text>
          </View>
        )}
        <View style={styles.body}>
          <View style={{margin: 10}}>
            <Button
              title={'Scan Bluetooth (' + (isScanning ? 'on' : 'off') + ')'}
              onPress={() => startScan()}
            />
          </View>
          <View style={{margin: 10}}>
            <Button
              title={'Get data from ESP32'}
              onPress={() => setFlag(true)}
            />
          </View>
          <View style={{margin: 10}}>
            <Text>{data}</Text>
          </View>

          <View style={{margin: 10}}>
            <Button
              title="Retrieve connected peripherals"
              onPress={() => retrieveConnected()}
            />
          </View>
          <View style={{margin: 10}}>
            <Button title={'Turn Off'} onPress={() => turnOff()} />
            <View style={{marginBottom: 10}}></View>
            <Button title={'Turn On'} onPress={() => turnOn()} />
          </View>

          {list.length == 0 && (
            <View style={{flex: 1, margin: 20}}>
              <Text style={{textAlign: 'center'}}>No peripherals</Text>
            </View>
          )}
        </View>
      </ScrollView>
      <FlatList
        data={list}
        renderItem={({item}) => renderItem(item)}
        keyExtractor={(item) => item.id}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    backgroundColor: Colors.lighter,
  },
  engine: {
    position: 'absolute',
    right: 0,
  },
  body: {
    backgroundColor: Colors.white,
  },
  sectionContainer: {
    marginTop: 32,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: Colors.black,
  },
  sectionDescription: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '400',
    color: Colors.dark,
  },
  highlight: {
    fontWeight: '700',
  },
  footer: {
    color: Colors.dark,
    fontSize: 12,
    fontWeight: '600',
    padding: 4,
    paddingRight: 12,
    textAlign: 'right',
  },
});

export default App;

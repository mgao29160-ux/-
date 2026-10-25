import React, { useEffect, useMemo, useState } from 'react';
import {
  SafeAreaView, View, Text, TextInput, TouchableOpacity, 
  ScrollView, StyleSheet, Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SUBJECTS = [
  'Matematica', 'Fisica', 'Italiano', 'Tema', 'Inglese', 'Biologia', 'Chimica', 
  'Scienze', 'Filosofia', 'Storia', 'Ginnastica', 'Informatica', 'Edu. Civica',
];

type DayData = {
  study: string[];
  fitness: boolean;
  diet: string;
  weight?: number;
  notes: string[];
  plans: string[];
};

type Data = Record<string, DayData>;
type Tab = 'today' | 'calendar' | 'stats';

const STORAGE_KEY = 'personal-workbench-v1';

const emptyDay = (): DayData => ({
  study: [], fitness: false, diet: '', notes: [], plans: [],
});

const todayKey = () => new Date().toISOString().slice(0, 10);

export default function App() {
  const [data, setData] = useState<Data>({});
  const [ready, setReady] = useState(false);
  const [selected, setSelected] = useState(todayKey());
  const [tab, setTab] = useState<Tab>('today');
  const [noteInput, setNoteInput] = useState('');
  const [planInput, setPlanInput] = useState('');
  const [weightInput, setWeightInput] = useState('');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) setData(JSON.parse(raw));
      })
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (ready) {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
  }, [data, ready]);

  const day = data[selected] ?? emptyDay();

  useEffect(() => {
    setWeightInput(day.weight ? String(day.weight) : '');
  }, [selected]);

  const updateDay = (patch: Partial<DayData>) => {
    setData((prev) => {
      const current = prev[selected] ?? emptyDay();
      return { ...prev, [selected]: { ...current, ...patch } };
    });
  };

  const toggleSubject = (subject: string) => {
    const current = day.study;
    updateDay({
      study: current.includes(subject)
        ? current.filter((s) => s !== subject)
        : [...current, subject],
    });
  };

  const addNote = () => {
    const value = noteInput.trim();
    if (!value) return;
    updateDay({ notes: [...day.notes, value] });
    setNoteInput('');
  };

  const addPlan = () => {
    const value = planInput.trim();
    if (!value) return;
    updateDay({ plans: [...day.plans, value] });
    setPlanInput('');
  };

  const saveWeight = () => {
    const value = Number(weightInput);
    if (!value || value <= 0) {
      Alert.alert('体重格式不对', '请输入数字，例如 65.5');
      return;
    }
    updateDay({ weight: value });
  };

  const calendarCells = useMemo(() => {
    const [year, month] = selected.split('-').map(Number);
    const firstDay = new Date(year, month - 1, 1);
    const daysInMonth = new Date(year, month, 0).getDate();
    const startOffset = (firstDay.getDay() + 6) % 7;
    const cells: (string | null)[] = [];
    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(`${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
    }
    return cells;
  }, [selected]);

  const stats = useMemo(() => {
    const entries = Object.entries(data);
    return {
      totalStudy: entries.reduce((sum, [, d]) => sum + d.study.length, 0),
      fitnessDays: entries.filter(([, d]) => d.fitness).length,
      noteCount: entries.reduce((sum, [, d]) => sum + d.notes.length, 0),
      weights: entries.filter(([, d]) => typeof d.weight === 'number').sort(([a], [b]) => a.localeCompare(b))
    };
  }, [data]);

  if (!ready) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.loading}>加载中…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>个人工作台</Text>
        <Text style={styles.dateText}>{selected}</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 24 }}>
        {tab === 'today' && (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>今日计划</Text>
              <View style={styles.row}>
                <TextInput
                  style={styles.input} placeholder="例如：复习 fisica 第三章" placeholderTextColor="#999"
                  value={planInput} onChangeText={setPlanInput}
                />
                <TouchableOpacity style={styles.addButton} onPress={addPlan}>
                  <Text style={styles.addButtonText}>添加</Text>
                </TouchableOpacity>
              </View>
              {day.plans.map((plan, index) => (
                <Text key={index} style={styles.listItem}>• {plan}</Text>
              ))}
              {day.plans.length === 0 && <Text style={styles.empty}>还没有计划</Text>}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>学习打卡</Text>
              <View style={styles.subjectGrid}>
                {SUBJECTS.map((subject) => {
                  const active = day.study.includes(subject);
                  return (
                    <TouchableOpacity
                      key={subject} style={[styles.subjectChip, active && styles.subjectChipActive]}
                      onPress={() => toggleSubject(subject)}
                    >
                      <Text style={[styles.subjectText, active && styles.subjectTextActive]}>
                        {subject}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>健身与饮食</Text>
              <TouchableOpacity
                style={[styles.bigToggle, day.fitness && styles.bigToggleActive]}
                onPress={() => updateDay({ fitness: !day.fitness })}
              >
                <Text style={[styles.bigToggleText, day.fitness && styles.bigToggleTextActive]}>
                  {day.fitness ? '✓ 今天已健身' : '今天健身打卡'}
                </Text>
              </TouchableOpacity>
              <Text style={styles.label}>饮食记录</Text>
              <TextInput
                style={[styles.input, styles.multiline]} placeholder="吃了什么…" placeholderTextColor="#999"
                multiline value={day.diet} onChangeText={(value) => updateDay({ diet: value })}
              />
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>体重记录</Text>
              <View style={styles.row}>
                <TextInput
                  style={styles.input} placeholder="例如 65.5" placeholderTextColor="#999"
                  keyboardType="decimal-pad" value={weightInput} onChangeText={setWeightInput}
                />
                <TouchableOpacity style={styles.addButton} onPress={saveWeight}>
                  <Text style={styles.addButtonText}>保存</Text>
                </TouchableOpacity>
              </View>
              {day.weight !== undefined && <Text style={styles.listItem}>当天体重：{day.weight} kg</Text>}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>随手记</Text>
              <View style={styles.row}>
                <TextInput
                  style={styles.input} placeholder="记一句话…" placeholderTextColor="#999"
                  value={noteInput} onChangeText={setNoteInput}
                />
                <TouchableOpacity style={styles.addButton} onPress={addNote}>
                  <Text style={styles.addButtonText}>添加</Text>
                </TouchableOpacity>
              </View>
              {day.notes.map((note, index) => (
                <Text key={index} style={styles.listItem}>“{note}”</Text>
              ))}
              {day.notes.length === 0 && <Text style={styles.empty}>还没有随手记</Text>}
            </View>
          </>
        )}

        {tab === 'calendar' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>月览</Text>
            <View style={styles.weekHeader}>
              {['一', '二', '三', '四', '五', '六', '日'].map((d) => (
                <Text key={d} style={styles.weekText}>{d}</Text>
              ))}
            </View>
            <View style={styles.calendarGrid}>
              {calendarCells.map((key, index) => {
                if (!key) return <View key={`empty-${index}`} style={styles.calendarCell} />;
                const cellData = data[key];
                const active = key === selected;
                const hasData = cellData && (cellData.study.length > 0 || cellData.fitness);
                return (
                  <TouchableOpacity
                    key={key} style={[styles.calendarCell, active && styles.calendarCellActive]}
                    onPress={() => setSelected(key)}
                  >
                    <Text style={[styles.calendarDay, active && styles.calendarDayActive]}>
                      {Number(key.slice(-2))}
                    </Text>
                    {hasData && <View style={styles.dot} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {tab === 'stats' && (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>总览</Text>
              <Text style={styles.statLine}>学习打卡总次数：{stats.totalStudy}</Text>
              <Text style={styles.statLine}>健身打卡天数：{stats.fitnessDays}</Text>
              <Text style={styles.statLine}>随手记数量：{stats.noteCount}</Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>体重记录</Text>
              {stats.weights.length === 0 && <Text style={styles.empty}>还没有体重记录</Text>}
              {stats.weights.map(([date, d]) => (
                <Text key={date} style={styles.listItem}>{date}：{d.weight} kg</Text>
              ))}
            </View>
          </>
        )}
      </ScrollView>

      <View style={styles.tabBar}>
        {[{ key: 'today', label: '今日' }, { key: 'calendar', label: '月览' }, { key: 'stats', label: '统计' }].map((item) => (
          <TouchableOpacity key={item.key} style={styles.tabItem} onPress={() => setTab(item.key as Tab)}>
            <Text style={[styles.tabText, tab === item.key && styles.tabTextActive]}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f7' },
  loading: { margin: 32, fontSize: 18, textAlign: 'center' },
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  title: { fontSize: 24, fontWeight: '700', color: '#111' },
  dateText: { marginTop: 4, color: '#666' },
  content: { flex: 1, padding: 12 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#eee' },
  cardTitle: { fontSize: 17, fontWeight: '700', marginBottom: 10, color: '#111' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#fafafa', color: '#111' },
  multiline: { minHeight: 80, textAlignVertical: 'top', marginTop: 6 },
  addButton: { backgroundColor: '#111', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11 },
  addButtonText: { color: '#fff', fontWeight: '600' },
  listItem: { marginTop: 8, color: '#333', lineHeight: 21 },
  empty: { marginTop: 8, color: '#999' },
  subjectGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  subjectChip: { borderWidth: 1, borderColor: '#ddd', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#fafafa' },
  subjectChipActive: { backgroundColor: '#111', borderColor: '#111' },
  subjectText: { color: '#333', fontSize: 13 },
  subjectTextActive: { color: '#fff', fontWeight: '600' },
  bigToggle: { borderWidth: 1, borderColor: '#ddd', borderRadius: 12, padding: 14, alignItems: 'center', backgroundColor: '#fafafa' },
  bigToggleActive: { backgroundColor: '#111', borderColor: '#111' },
  bigToggleText: { fontSize: 16, color: '#333', fontWeight: '600' },
  bigToggleTextActive: { color: '#fff' },
  label: { marginTop: 14, marginBottom: 4, color: '#666' },
  weekHeader: { flexDirection: 'row', marginBottom: 6 },
  weekText: { width: '14.2857%', textAlign: 'center', color: '#888', fontSize: 12 },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calendarCell: { width: '14.2857%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  calendarCellActive: { backgroundColor: '#111' },
  calendarDay: { color: '#333' },
  calendarDayActive: { color: '#fff', fontWeight: '700' },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#ff7a00', marginTop: 3 },
  statLine: { fontSize: 16, marginTop: 8, color: '#222' },
  tabBar: { flexDirection: 'row', backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eee', paddingBottom: 8 },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  tabText: { color: '#888', fontSize: 15 },
  tabTextActive: { color: '#111', fontWeight: '700' },
});

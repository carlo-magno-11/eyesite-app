import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';

export default function AdminEstadisticas() {
  return (
    <ScreenContainer edges={['top', 'left', 'right']} containerClassName="bg-background">
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={styles.container}>
          <Text style={styles.title}>Estadísticas</Text>
          <Text style={styles.subtitle}>Métricas y actividad en tiempo real</Text>
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>📊</Text>
            <Text style={styles.placeholderTitle}>Próximamente</Text>
            <Text style={styles.placeholderDesc}>Esta sección estará disponible pronto</Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#9A9A9A',
    marginBottom: 32,
  },
  placeholder: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderStyle: 'dashed',
  },
  placeholderText: {
    fontSize: 48,
    marginBottom: 16,
  },
  placeholderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  placeholderDesc: {
    fontSize: 13,
    color: '#9A9A9A',
  },
});

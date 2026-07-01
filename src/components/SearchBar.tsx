import { StyleSheet, TextInput } from 'react-native';

type SearchBarProps = {
  search: string;
  setSearch: (text: string) => void;
};

export function SearchBar({ search, setSearch }: SearchBarProps) {
  return (
    <TextInput
      style={styles.searchInput}
      placeholder="Rechercher dans mes notes..."
      value={search}
      onChangeText={setSearch}
    />
  );
}

const styles = StyleSheet.create({
  searchInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 18,
    color: '#111827',
  },
});
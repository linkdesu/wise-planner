import { ChakraProvider, Box, Flex, Heading, Tabs, TabList, TabPanels, Tab, TabPanel, Button, useToast } from '@chakra-ui/react';
import theme from './theme/monokai';
import { Overview } from './components/Overview';
import { AccountManager } from './components/AccountManager';
import { SetupManager } from './components/SetupManager';
import { PositionWorkspace } from './components/PositionWorkspace';
import { usePlanner } from './hooks/usePlanner';

function App () {
  const { exportData, importData } = usePlanner();
  const toast = useToast();

  const handleExport = () => {
    const data = exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `planner_backup_${new Date().toISOString()}.json`;
    a.click();
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const text = await file.text();
        try {
          importData(text);
          toast({ title: 'Data Imported', status: 'success' });
        } catch (err) {
          toast({ title: 'Import Failed', status: 'error' });
        }
      }
    };
    input.click();
  };

  return (
    <ChakraProvider theme={theme}>
      <Box minH="100vh" bg="monokai.bg" color="monokai.fg" p={4}>
        <Flex justify="space-between" align="center" mb={6}>
          <Heading size="lg" color="monokai.yellow">Termial Position Planner</Heading>
          <Flex gap={2}>
            <Button size="sm" variant="outline" onClick={handleExport}>Export JSON</Button>
            <Button size="sm" variant="outline" onClick={handleImport}>Import JSON</Button>
          </Flex>
        </Flex>

        <Tabs variant="enclosed" colorScheme="orange">
          <TabList borderColor="monokai.gray.300">
            <Tab _selected={{ color: 'monokai.pink', borderColor: 'monokai.pink', borderBottomColor: 'monokai.bg' }}>Overview</Tab>
            <Tab _selected={{ color: 'monokai.pink', borderColor: 'monokai.pink', borderBottomColor: 'monokai.bg' }}>Position Workspace</Tab>
            <Tab _selected={{ color: 'monokai.pink', borderColor: 'monokai.pink', borderBottomColor: 'monokai.bg' }}>Accounts</Tab>
            <Tab _selected={{ color: 'monokai.pink', borderColor: 'monokai.pink', borderBottomColor: 'monokai.bg' }}>Setups</Tab>
          </TabList>

          <TabPanels>
            <TabPanel>
              <Overview />
            </TabPanel>
            <TabPanel>
              <PositionWorkspace />
            </TabPanel>
            <TabPanel>
              <AccountManager />
            </TabPanel>
            <TabPanel>
              <SetupManager />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Box>
    </ChakraProvider>
  );
}

export default App;

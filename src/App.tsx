import { Box, Button, ChakraProvider, Flex, Heading, Tabs } from '@chakra-ui/react';
import dayjs from 'dayjs';
import { AccountManager } from './components/AccountManager';
import { Overview } from './components/Overview';
import { PositionWorkspace } from './components/PositionWorkspace';
import { SetupManager } from './components/SetupManager';
import { Toaster, toaster } from './components/ui/toaster';
import { FILE_DATETIME_FORMAT } from './const';
import { usePlanner } from './hooks/usePlanner';
import system from './theme/monokai';

function App () {
  const { exportData, importData, clearAllData, isLoading } = usePlanner();
  const showDevTools = new URLSearchParams(window.location.search).has('dev');

  const handleExport = () => {
    const data = exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `planner_backup_${dayjs().format(FILE_DATETIME_FORMAT).replace(' ', '_')}.json`;
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
          await importData(text);
          toaster.create({ title: 'Data Imported', type: 'success' });
        } catch {
          toaster.create({ title: 'Import Failed', type: 'error' });
        }
      }
    };
    input.click();
  };

  const handleClearData = () => {
    clearAllData();
  };

  if (isLoading) {
    return (
      <ChakraProvider value={system}>
        <Box
          minH="100vh"
          bg="bg"
          color="fg"
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          <Heading size="md" color="surface">
            Initializing ...
          </Heading>
        </Box>
      </ChakraProvider>
    );
  }

  return (
    <ChakraProvider value={system}>
      <Box minH="100vh" bg="bg" color="fg" p={4}>
        <Flex justify="space-between" align="center" mb={6}>
          <Heading size="lg" color="brand">
            Wise Planner
          </Heading>
          <Flex gap={2}>
            {showDevTools && (
              <Button
                size="sm"
                variant="solid"
                bg="danger"
                color="bg"
                _hover={{ bg: 'accentAlt', color: 'bg' }}
                onClick={handleClearData}
              >
                Clear Data
              </Button>
            )}
            <Button
              size="sm"
              variant="solid"
              bg="success"
              color="bg"
              _hover={{ bg: 'accentAlt', color: 'bg' }}
              onClick={handleExport}
            >
              Export JSON
            </Button>
            <Button
              size="sm"
              variant="solid"
              bg="danger"
              color="bg"
              _hover={{ bg: 'accentAlt', color: 'bg' }}
              onClick={handleImport}
            >
              Import JSON
            </Button>
          </Flex>
        </Flex>

        <Tabs.Root defaultValue="overview" variant="outline">
          <Tabs.List>
            <Tabs.Trigger
              value="overview"
              color="muted"
              _selected={{ color: 'accentAlt', borderColor: 'muted', borderBottomColor: 'bg' }}
            >
              Overview
            </Tabs.Trigger>
            <Tabs.Trigger
              value="workspace"
              color="muted"
              _selected={{ color: 'accentAlt', borderColor: 'muted', borderBottomColor: 'bg' }}
            >
              Position Workspace
            </Tabs.Trigger>
            <Tabs.Trigger
              value="accounts"
              color="muted"
              _selected={{ color: 'accentAlt', borderColor: 'muted', borderBottomColor: 'bg' }}
            >
              Accounts
            </Tabs.Trigger>
            <Tabs.Trigger
              value="setups"
              color="muted"
              _selected={{ color: 'accentAlt', borderColor: 'muted', borderBottomColor: 'bg' }}
            >
              Setups
            </Tabs.Trigger>
          </Tabs.List>

          <Tabs.Content value="overview">
            <Overview />
          </Tabs.Content>
          <Tabs.Content value="workspace">
            <PositionWorkspace />
          </Tabs.Content>
          <Tabs.Content value="accounts">
            <AccountManager />
          </Tabs.Content>
          <Tabs.Content value="setups">
            <SetupManager />
          </Tabs.Content>
        </Tabs.Root>
      </Box>

      <Toaster />
    </ChakraProvider>
  );
}

export default App;

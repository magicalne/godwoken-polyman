import React from "react";
import { makeStyles, Theme } from "@material-ui/core/styles";
import AppBar from "@material-ui/core/AppBar";
import Tabs from "@material-ui/core/Tabs";
import Tab from "@material-ui/core/Tab";
import Typography from "@material-ui/core/Typography";
import Box from "@material-ui/core/Box";
import { Paper } from "@material-ui/core";

interface TabPanelProps {
  children?: React.ReactNode;
  index: any;
  value: any;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      style={{
        minHeight: "400px",
      }}
      {...other}
    >
      {value === index && (
        <Box p={3}>
          <Typography>{children}</Typography>
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: any) {
  return {
    id: `simple-tab-${index}`,
    "aria-controls": `simple-tabpanel-${index}`,
  };
}

const useStyles = makeStyles((theme: Theme) => ({
  root: {
    flexGrow: 1,
    backgroundColor: theme.palette.grey[100],
    color: theme.palette.common.black
  },
}));

export interface SimpleTabsProps {
  names: string[];
  tabs: React.ReactNode[];
}

export default function SimpleTabs(props: SimpleTabsProps) {
  const classes = useStyles();
  const [value, setValue] = React.useState(0);

  const { names, tabs } = props;

  const tabsNameJsx = names.map((name, index) => {
    return <Tab label={name} {...a11yProps(index)} />;
  });

  const tabPanelJsx = tabs.map((tab, index) => {
    return (
      <TabPanel value={value} index={index}>
        {tab}
      </TabPanel>
    );
  });

  const handleChange = (event: React.ChangeEvent<{}>, newValue: number) => {
    setValue(newValue);
  };

  return (
    <div className={classes.root}>
      <Paper square>
        <Tabs
          value={value}
          onChange={handleChange}
          aria-label="simple tabs example"
          centered={true}
        >
          {tabsNameJsx}
        </Tabs>
      </Paper>
      { tabPanelJsx } 
    </div>
  );
}

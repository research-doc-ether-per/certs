
components: {
  MuiContainer: {
    styleOverrides: {
      root: ({ theme }) => ({
        paddingLeft: `calc(clamp(${theme.spacing(2)}, 4vw, ${theme.spacing(4)}) + 16px)`,
        paddingRight: `calc(clamp(${theme.spacing(2)}, 4vw, ${theme.spacing(4)}) + 16px)`,
      }),
    },
  },
},

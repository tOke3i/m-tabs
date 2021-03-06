import React from 'react';
import {
  default as RN,
  Dimensions,
  View,
  Animated,
  ScrollView,
  InteractionManager,
  Platform,
} from 'react-native';
import { PropsType as BasePropsType } from './PropsType';
import { Tabs as Component, StateType as BaseStateType } from './Tabs.base';
import { DefaultTabBar } from './DefaultTabBar';
import Styles from './Styles.native';
import { TabPane } from './TabPane.native';

export interface PropsType extends BasePropsType {
  children?: any;
  style?: RN.ViewStyle;
  styles?: typeof Styles;
}
export interface StateType extends BaseStateType {
  scrollX: Animated.Value;
  scrollValue: Animated.Value;
  containerWidth: number;
}
export class Tabs extends Component<PropsType, StateType> {
  static DefaultTabBar = DefaultTabBar;

  static defaultProps = {
    ...Component.defaultProps,
    style: {},
  } as PropsType;

  AnimatedScrollView: ScrollView = Animated.createAnimatedComponent(ScrollView);
  scrollView: { _component: ScrollView };

  constructor(props: PropsType) {
    super(props);
    const width = Dimensions.get('window').width;

    const pageIndex = this.getTabIndex(props);
    this.state = {
      ...this.state,
      scrollX: new Animated.Value(pageIndex * width),
      scrollValue: new Animated.Value(pageIndex),
      containerWidth: width,
    };
  }

  componentDidMount() {
    InteractionManager.runAfterInteractions(() => {
      if (Platform.OS === 'android') {
        this.scrollTo(this.state.currentTab, false);
      }
    });

    this.state.scrollX.addListener(({ value, }) => {
      const scrollValue = value / this.state.containerWidth;
      this.state.scrollValue.setValue(scrollValue);
    });
  }

  onScroll = (evt?: RN.NativeSyntheticEvent<RN.NativeScrollEvent>) => {
    const { animated } = this.props;
    if (evt && animated) {
      Animated.event([{
        nativeEvent: { contentOffset: { x: this.state.scrollX } }
      }], )(evt);
    }
  }

  setScrollView = (sv: any) => {
    this.scrollView = sv;
    this.scrollTo(this.state.currentTab);
  }

  renderContent = (getSubElements = this.getSubElements()) => {
    const { tabs, usePaged } = this.props;
    const { currentTab = 0, containerWidth = 0 } = this.state;

    const AnimatedScrollView = this.AnimatedScrollView;
    return <AnimatedScrollView key="$content"
      horizontal
      pagingEnabled={usePaged}
      automaticallyAdjustContentInsets={false}
      ref={this.setScrollView}
      onScroll={this.onScroll}
      onMomentumScrollEnd={this.onMomentumScrollEnd}
      scrollEventThrottle={16}
      scrollsToTop={false}
      showsHorizontalScrollIndicator={false}
      scrollEnabled={this.props.swipeable}
      directionalLockEnabled
      alwaysBounceVertical={false}
      keyboardDismissMode="on-drag"
    >
      {
        tabs.map((tab, index) => {
          const key = tab.key || `tab_${index}`;
          return <TabPane key={key}
            shouldUpdate={this.shouldUpdateTab(index)}
            active={currentTab === index}
            style={{ width: containerWidth }}
          >
            {this.shouldRenderTab(index) && this.getSubElement(tab, index, getSubElements)}
          </TabPane>;
        })
      }
    </AnimatedScrollView>;
  }

  onMomentumScrollEnd = (e: RN.NativeSyntheticEvent<RN.NativeScrollEvent>) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const page = this.getOffsetIndex(offsetX, this.state.containerWidth);
    if (this.state.currentTab !== page) {
      this.goToTab(page);
    }
  }

  goToTab(index: number, force: boolean = false, animated = this.props.animated) {
    const result = super.goToTab(index, force);
    if (result) {
      requestAnimationFrame(() => {
        this.scrollTo(this.state.currentTab, animated);
      });
    }
    return result;
  }

  handleLayout = (e: RN.LayoutChangeEvent) => {
    const { width } = e.nativeEvent.layout;
    if (Math.round(width) !== Math.round(this.state.containerWidth)) {
      requestAnimationFrame(() => {
        this.scrollTo(this.state.currentTab, false);
      });
      this.setState({ containerWidth: width });
    }
  }

  scrollTo = (index: number, animated = true) => {
    const { containerWidth } = this.state;
    if (containerWidth) {
      const offset = index * containerWidth;
      if (this.scrollView && this.scrollView._component) {
        const { scrollTo } = this.scrollView._component;
        scrollTo && scrollTo({ x: offset, animated });
      }
    }
  }

  render() {
    const { tabBarPosition, styles = Styles } = this.props;
    const { scrollX, scrollValue, containerWidth } = this.state;
    // let overlayTabs = (this.props.tabBarPosition === 'overlayTop' || this.props.tabBarPosition === 'overlayBottom');
    let overlayTabs = false;

    let tabBarProps = {
      ...this.getTabBarBaseProps(),

      scrollX: scrollX,
      scrollValue: scrollValue,
      containerWidth: containerWidth,
    };

    if (overlayTabs) {
      // tabBarProps.style = {
      //     position: 'absolute',
      //     left: 0,
      //     right: 0,
      //     [this.props.tabBarPosition === 'overlayTop' ? 'top' : 'bottom']: 0,
      // };
    }

    const content = [
      <View key="$tabbar" style={tabBarPosition === 'top' ? styles.Tabs.topTabBarSplitLine : styles.Tabs.bottomTabBarSplitLine}>
        {this.renderTabBar(tabBarProps, DefaultTabBar)}
      </View>,
      this.renderContent()
    ];

    return <View style={{
      ...styles.Tabs.container, ...this.props.style,
    }} onLayout={this.handleLayout}>
      {tabBarPosition === 'top' ? content : content.reverse()}
    </View>;
  }
}

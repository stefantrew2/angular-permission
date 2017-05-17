describe('permission', function () {
  'use strict';

  describe('directives', function () {
    describe('directive: Permission: Params', function () {

      var $log;
      var $state;
      var $compile;
      var $rootScope;
      var $stateProvider;
      var PermAuthorization;
      var PermRoleStore;
      var PermPermissionMap;


      beforeEach(function () {
        // Instantiate module
        module('permission');

        module('ui.router', function ($injector) {
          $stateProvider = $injector.get('$stateProvider');
        });

        installPromiseMatchers(); // jshint ignore:line

        // Inject services into module
        inject(function ($injector) {
          $log = $injector.get('$log');
          $state = $injector.get('$state');
          $compile = $injector.get('$compile');
          $rootScope = $injector.get('$rootScope').$new();
          PermAuthorization = $injector.get('PermAuthorization');
          PermRoleStore = $injector.get('PermRoleStore');
          PermPermissionMap = $injector.get('PermPermissionMap');
        });
      });

      // Initialize permissions
      beforeEach(function () {
        PermRoleStore.defineRole('USER', function (permissionName, transitionProperties, params) {
          return angular.isDefined(params) && params !== {};
        });

        PermRoleStore.defineRole('AUTHORIZED', function (permissionName, transitionProperties, params) {
          return params.foo === true;
        });

        PermRoleStore.defineRole('ADMIN', function (permissionName, transitionProperties, params) {
          return params.foo !== true;
        });

        PermRoleStore.defineRole('UNAUTHORIZED', function (permissionName, transitionProperties, params) {
          return params.foo !== true;
        });
      });

      it('should show element if authorized when params are defined', function () {
        // GIVEN
        var element = angular.element('<div permission permission-params="[{foo : true}]" permission-only="[\'USER\']"></div>');

        // WHEN
        $compile(element)($rootScope);
        $rootScope.$digest();

        // THEN
        expect(element.hasClass('ng-hide')).toBeFalsy();
      });

      it('should show element if authorized when params are undefined', function () {
        // GIVEN
        var element = angular.element('<div permission permission-only="[\'USER\']"></div>');

        // WHEN
        $compile(element)($rootScope);
        $rootScope.$digest();

        // THEN
        expect(element.hasClass('ng-hide')).toBeFalsy();
      });

      
      it('should show element if authorized when params are passed as variable reference', function () {
        // GIVEN
        var element = angular.element('<div permission permission-params="params" permission-only="[\'USER\']"></div>');
        $rootScope.params = {foo : true};

        // WHEN
        $compile(element)($rootScope);
        $rootScope.$digest();

        // THEN
        expect(element.hasClass('ng-hide')).toBeFalsy();
      });


      it('should hide element if unauthorized when permissions are passed as string array and function with params is true', function () {
        // GIVEN
        var element = angular.element('<div permission permission-params="[{foo : true}]" permission-except="[\'USER\']"></div>');

        // WHEN
        $compile(element)($rootScope);
        $rootScope.$digest();

        // THEN
        expect(element.hasClass('ng-hide')).toBeTruthy();
      });


      it('should watch for changes in "params" attribute', function () {
        // GIVEN
        var element = angular.element('<div permission permission-params="params" permission-only="[\'AUTHORIZED\']"></div>');
        $rootScope.params = {foo : true};
        $compile(element)($rootScope);
        $rootScope.$digest();

        // WHEN
        $rootScope.params = {foo : false};
        $rootScope.$digest();

        // THEN
        expect(element.hasClass('ng-hide')).toBeTruthy();
      });

      it('should call provided "onAuthorized" function when authorized', function () {
        // GIVEN
        $rootScope.only = ['USER'];
        $rootScope.params = {foo : true};
        $rootScope.onAuthorized = function (element) {
          element.removeAttr('disabled');
        };

        spyOn($rootScope, 'onAuthorized').and.callThrough();

        // WHEN
        var element = $compile('<input permission permission-params="params" permission-only="only" permission-on-authorized="onAuthorized" disabled="disabled">')($rootScope);
        $rootScope.$digest();

        // THEN
        expect($rootScope.onAuthorized).toHaveBeenCalled();
        expect(element.attr('disabled')).not.toBeDefined();
      });

      it('should call provided "onUnauthorized" function when authorized', function () {
        // GIVEN
        $rootScope.only = ['UNAUTHORIZED'];
        $rootScope.params = {foo : true};
        $rootScope.onUnauthorized = function (element) {
          element.attr('disabled', 'disabled');
        };

        spyOn($rootScope, 'onUnauthorized').and.callThrough();

        // WHEN
        var element = $compile('<input permission permission-params="params" permission-only="only" permission-on-unauthorized="onUnauthorized">')($rootScope);
        $rootScope.$digest();

        // THEN
        expect($rootScope.onUnauthorized).toHaveBeenCalled();
        expect(element.attr('disabled')).toEqual('disabled');
      });

      it('should call authorizeByPermissionMap method', function () {
        // GIVEN
        var element = angular.element('<div permission permission-except="[\'USER\']"></div>');
        spyOn(PermAuthorization, 'authorizeByPermissionMap');

        // WHEN
        $compile(element)($rootScope);
        $rootScope.$digest();

        // THEN
        expect(PermAuthorization.authorizeByPermissionMap).toHaveBeenCalledWith(new PermPermissionMap({
          only: undefined,
          except: ['USER'],
          redirectTo: undefined
        }));
      });

      it('should resolve multiple authorization calls properly', function () {
        // GIVEN
        var element = angular.element(
          '<div permission permission-params="params" permission-only="\'UNAUTHORIZED\'"></div>' +
          '<div permission permission-params="params" permission-only="\'USER\'"></div>' +
          '<div permission permission-params="params" permission-only="\'AUTHORIZED\'"></div>'
        );

        spyOn(PermAuthorization, 'authorizeByPermissionMap').and.callThrough();
        $rootScope.params = {foo : true};
        // WHEN
        $compile(element)($rootScope);
        $rootScope.$digest();

        // THEN
        expect(PermAuthorization.authorizeByPermissionMap).toHaveBeenCalledTimes(3);

        expect(PermAuthorization.authorizeByPermissionMap).toHaveBeenCalledWith(new PermPermissionMap({
          only: ['USER'],
          params : {foo : true},
          except: undefined,
          redirectTo: undefined
        }));

        expect(PermAuthorization.authorizeByPermissionMap).toHaveBeenCalledWith(new PermPermissionMap({
          only: ['UNAUTHORIZED'],
          params : {foo : true},
          except: undefined,
          redirectTo: undefined
        }));

        expect(PermAuthorization.authorizeByPermissionMap).toHaveBeenCalledWith(new PermPermissionMap({
          only: ['AUTHORIZED'],
          params : {foo : true},
          except: undefined,
          redirectTo: undefined
        }));

        expect(angular.element(element[0]).hasClass('ng-hide')).toBeTruthy();
        expect(angular.element(element[1]).hasClass('ng-hide')).toBeFalsy();
        expect(angular.element(element[2]).hasClass('ng-hide')).toBeFalsy();
      });
    });
  });
});
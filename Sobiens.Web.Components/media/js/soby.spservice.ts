﻿// VERSION 1.0.4.2
function ajaxHelper(uri, method, data, args, successCallback, errorCallback) {
    return $.ajax({
        type: method,
        url: uri,
        dataType: 'json',
        contentType: 'application/json',
        data: data ? JSON.stringify(data) : null
    }).fail(function (jqXHR, textStatus, errorThrown) {
        errorCallback(jqXHR, textStatus, errorThrown, args);
    }).done(function (item) {
        successCallback(item, args);
    });
}
// ********************* TRANSPORT *****************************
class soby_Transport {
    Read: soby_TransportRequest;
    Add: soby_TransportRequest;
    Update: soby_TransportRequest;
    Delete: soby_TransportRequest;
}

class soby_TransportRequest {
    constructor(url: string, dataType: string, contentType: string, type: string) {
        this.Url = url;
        this.DataType = dataType;
        this.ContentType = contentType;
        this.Type = type;
    }
    Url: string;
    DataType: string;
    ContentType: string;
    Type: string;
}
// ******************************************************************


// ********************* HELPER METHODS *****************************
var soby_FilterValueSeperator = "_SDX_";
class SobyFieldTypesObject{
    Text:number = 0;
    Number:number = 1;
    MultiChoice:number = 2;
    Lookup:number = 3;
    Boolean:number = 4;
    Choice:number = 5;
    ModStat:number = 6;
    User:number = 7;
    TaxonomyFieldType:number = 8;
    DateTime:number = 9;
    Integer:number = 10;
    CurrentUserGroups:number = 11;
    DateTimeNowDifferenceAsMinute:number = 12;
    DateTimeRange:number = 13;
}
class SobyFilterTypesObject {
    Equal:number = 0;
    NotEqual: number = 1;
    Contains: number = 2;
    In: number = 3;
    Greater: number = 4;
    Lower: number = 5;
    GreaterEqual: number = 6;
    LowerEqual: number = 7;
    BeginsWith: number = 8;
    Membership: number = 9;
}
class SobyAggregateTypesObject {
    Average: number = 0;
    Count: number = 1;
    Max: number = 2;
    Min: number = 3;
    Sum: number = 4;
    GetAggregateTypeName(aggregateType: number) {
        if (aggregateType == 0)
            return "Average";
        else if (aggregateType == 1)
            return "Count";
        else if (aggregateType == 2)
            return "Max";
        else if (aggregateType == 3)
            return "Min";
        else if (aggregateType == 4)
            return "Sum";

    }
}

var SobyFieldTypes = new SobyFieldTypesObject();
var SobyFilterTypes = new SobyFilterTypesObject();
var SobyAggregateTypes = new SobyAggregateTypesObject();
interface ISobyFilter {
}

class SobyFilters implements ISobyFilter {
    IsOr: boolean;
    constructor(isOr: boolean) {
        this.IsOr = isOr;
    }

    Filters = new Array();
    AddFilter(fieldName: string, filterValue: string, fieldType: number, filterType: number, lookupID: boolean) {
        var sobyFilter = new SobyFilter(fieldName, filterValue, fieldType, filterType, lookupID);
        this.Filters.push(sobyFilter);
    }

    AddFilterObject(filter: SobyFilter) {
        this.Filters.push(filter);
    }

    AddFilterCollection(sobyFilters: SobyFilters) {
        this.Filters.push(sobyFilters);
        /*
        for (var i = 0; i < sobyFilters.Filters.length; i++) {
            this.Filters[this.Filters.length] = sobyFilters.Filters[i];
        }
        */
    }

    ToCaml(): string {
        var camlString = "";
        var filterCompareString = this.IsOr == true ? "Or" : "And";
        for (var i = 0; i < this.Filters.length; i++) {
            if (this.Filters.length == 1) {
                camlString += this.Filters[i].ToCaml();
            }
            else if (i == 1) {
                camlString += "<" + filterCompareString + ">" + this.Filters[i - 1].ToCaml() + this.Filters[i].ToCaml() + "</" + filterCompareString + ">";
            }
            else if (i % 2 == 1) {
                camlString = "<" + filterCompareString + ">" + camlString + "<" + filterCompareString + ">" + this.Filters[i - 1].ToCaml() + this.Filters[i].ToCaml() + "</" + filterCompareString + "></" + filterCompareString + ">";
            }
            else if (i == this.Filters.length - 1) {
                camlString = "<" + filterCompareString + ">" + camlString + this.Filters[i].ToCaml() + "</" + filterCompareString + ">"
            }
        }
        return camlString;
    }

    ToXml() {
        var xml = "";
        for (var i = 0; i < this.Filters.length; i++) {
            var argument = this.Filters[i];
            xml += "<" + argument.FieldName + ">" + argument.FilterValue + "</" + argument.FieldName + ">";
        }

        return xml;
    }

    ToJson() {
        var json = "";
        for (var i = 0; i < this.Filters.length; i++) {
            var argument = this.Filters[i];
            json += "'" + argument.FieldName + "': \"" + argument.FilterValue + "\",";
        }

        if (json != "")
            return json.substr(0, json.length - 1);

        return json;
    }

    ToQueryString() {
        if (this.Filters.length == 0)
            return "";

        var json = "(";
        for (var i = 0; i < this.Filters.length; i++) {
            var argument = this.Filters[i];
            json += argument.ToQueryString();
            if (i < this.Filters.length-1) // Only if it is not last item
            {
                if (this.IsOr)
                    json += " or "
                else
                    json += " and "
            }
        }
        json += ")";

        return json;
    }

    Clone(): SobyFilters {
        var sobyFilters = new SobyFilters(this.IsOr);
        for (var i = 0; i < this.Filters.length; i++) {
            var filter = this.Filters[i];
            if (filter instanceof SobyFilter) {
                sobyFilters.AddFilter(filter.FieldName, filter.FilterValue, filter.FieldType, filter.FilterType, filter.LookupID);
            }
            else {
                sobyFilters.AddFilterCollection(filter.Clone());
            }
        }

        return sobyFilters;
    }
}
class SobyFilter implements ISobyFilter {
    FieldName: string;
    FilterValue: string;
    FieldType: number;
    FilterType: number;
    LookupID: boolean;

    constructor(fieldName: string, filterValue: string, fieldType: number, filterType: number, lookupID: boolean) {
        this.FieldName = fieldName;
        this.FieldType = fieldType;
        this.FilterType = filterType;
        this.FilterValue = filterValue;
        this.LookupID = lookupID;
    }


    ToCaml(): string {
        // <Eq><FieldRef Name='SessionNumber' /><Value Type='Number'>{1}</Value></Eq>
        var additionalFieldRefAttributes = "";
        var equvialentString = "";
        var valueString = "";
        if (this.LookupID == true) {
            additionalFieldRefAttributes = "LookupId=\"True\"";
        }

        var valueTypeString = "";
        switch (this.FieldType) {
            case SobyFieldTypes.Text:
                valueTypeString = "Text";
                break;
            case SobyFieldTypes.Number:
                valueTypeString = "Number";
                break;
            case SobyFieldTypes.Integer:
                valueTypeString = "Integer";
                break;
            case SobyFieldTypes.MultiChoice:
                valueTypeString = "MultiChoice";
                break;
            case SobyFieldTypes.Choice:
                valueTypeString = "Choice";
                break;
            case SobyFieldTypes.Boolean:
                valueTypeString = "Boolean";
                break;
            case SobyFieldTypes.ModStat:
                valueTypeString = "ModStat";
                break;
            case SobyFieldTypes.Lookup:
                valueTypeString = "Lookup";
                break;
            case SobyFieldTypes.CurrentUserGroups:
                valueTypeString = "CurrentUserGroups";
                break;
            case SobyFieldTypes.TaxonomyFieldType:
                valueTypeString = "TaxonomyFieldType";
            //return "<" + equvialentString + "><FieldRef Name=\"" + this.FieldName + "\" " + additionalFieldRefAttributes + " /><Values><Value Type=\"" + valueTypeString + "\">" + this.FilterValue + "</Value></Values></" + equvialentString + ">";
            //<In><FieldRef Name="Location" LookupId="TRUE"><Values><Value Type="Integer">13</Value><Value Type="Integer">3</Value><Value Type="Integer">9</Value></Values></In>
        }

        var value = this.FilterValue;
        if (value == "[*ME*]")
            valueString = "<Value Type='" + valueTypeString + "'><UserID /></Value>";
        else
            valueString = "<Value Type='" + valueTypeString + "'><![CDATA[" + this.FilterValue + "]]></Value>";
        switch (this.FilterType) {
            case SobyFilterTypes.Equal:
                equvialentString = "Eq";
                break;
            case SobyFilterTypes.NotEqual:
                equvialentString = "Neq";
                break;
            case SobyFilterTypes.Greater:
                equvialentString = "Gt";
                break;
            case SobyFilterTypes.Lower:
                equvialentString = "Lt";
                break;
            case SobyFilterTypes.GreaterEqual:
                equvialentString = "Geq";
                break;
            case SobyFilterTypes.LowerEqual:
                equvialentString = "Leq";
                break;
            case SobyFilterTypes.Contains:
                equvialentString = "Contains";
                break;
            case SobyFilterTypes.BeginsWith:
                equvialentString = "BeginsWith";
                break;
            case SobyFilterTypes.Membership:
                equvialentString = "Membership";
                valueString = "";
                break;
            case SobyFilterTypes.In:
                equvialentString = "In";
                var values = this.FilterValue.split(soby_FilterValueSeperator);
                valueString = "<Values>";
                for (var i = 0; i < values.length; i++) {
                    valueString += "<Value Type='" + valueTypeString + "'><![CDATA[" + values[i] + "]]></Value>";
                }
                valueString += "</Values>";
                break;
        }
        return "<" + equvialentString + (this.FilterType == SobyFilterTypes.Membership ? " Type='" + valueTypeString + "'" : "") + "><FieldRef Name='" + this.FieldName + "' " + additionalFieldRefAttributes + " />" + valueString + "</" + equvialentString + ">";
    }

    ToQueryString() {
        var json = "";
        var value = this.FilterValue;
        var valueFilterString = "";
        switch (this.FilterType) {
            case SobyFilterTypes.Equal:
                if (this.FieldType == SobyFieldTypes.Text)
                    valueFilterString = this.FieldName + " eq '" + value + "'";
                else
                    valueFilterString = this.FieldName + " eq " + value;
                break;
            case SobyFilterTypes.NotEqual:
                if (this.FieldType == SobyFieldTypes.Text)
                    valueFilterString = this.FieldName + " neq '" + value + "'";
                else
                    valueFilterString = this.FieldName + " neq " + value;
                break;
            case SobyFilterTypes.Greater:
                valueFilterString = this.FieldName + " gt " + value;
                break;
            case SobyFilterTypes.Lower:
                valueFilterString = this.FieldName + " lt " + value;
                break;
            case SobyFilterTypes.GreaterEqual:
                valueFilterString = this.FieldName + " geq " + value;
                break;
            case SobyFilterTypes.LowerEqual:
                valueFilterString = this.FieldName + " leq " + value;
                break;
            case SobyFilterTypes.Contains:
                valueFilterString = "contains(" + this.FieldName + ", '" + value + "')";
                break;
            case SobyFilterTypes.BeginsWith:
                valueFilterString = "beginswith";
                break;
        }

        json += valueFilterString;

        return json;
    }


}
class SobySchemaFields extends Array<SobySchemaField> {
    toWebAPIString() {
        var webAPIString = "";
        var expandString = "";
        for (var i = 0; i < this.length; i++) {
            webAPIString += "," + this[i].FieldName;
            if (this[i].FieldType == SobyFieldTypes.Lookup) {
                expandString += "," + this[i].Args.ModelName;
            }
        }

        if (expandString != "")
            expandString = "$expand=" + expandString.substr(1) + "&";

        return expandString + "$select=" + webAPIString.substr(1);
    }
}
class SobySchemaField {
    FieldName: string;
    FieldType: number;
    Args;
    constructor(fieldName: string, fieldType: number, args) {
        this.FieldName = fieldName;
        this.FieldType = fieldType;
        this.Args = args;
    }
}
class SobyOrderByFields extends Array<SobyOrderByField> {
    GetOrderFieldByName(fieldName: string) {
        for (var i = 0; i < this.length; i++) {
            if (this[i].FieldName.toLowerCase() == fieldName.toLowerCase())
                return this[i];
        }

        return null;
    }
    ContainsField(fieldName: string) {
        for (var i = 0; i < this.length; i++) {
            if (this[i].FieldName.toLowerCase() == fieldName.toLowerCase())
                return true;
        }

        return false;
    }
    ContainsFieldAsAsc(fieldName: string) {
        for (var i = 0; i < this.length; i++) {
            if (this[i].FieldName.toLowerCase() == fieldName.toLowerCase())
            {
                return this[0].IsAsc;
            }
        }

        return false;
    }
}
class SobyOrderByField {
    constructor(fieldName: string, isAsc: boolean) {
        this.FieldName = fieldName;
        this.IsAsc = isAsc;
    }
    FieldName: string;
    IsAsc: boolean = false;
}
class SobyAggregateFields extends Array<SobyAggregateField> {
    ContainsField(fieldName: string) {
        for (var i = 0; i < this.length; i++) {
            if (this[i].FieldName.toLowerCase() == fieldName.toLowerCase())
                return true;
        }

        return false;
    }
}

class SobyGroupByFields extends Array<SobyGroupByField> {
    ContainsField(fieldName: string) {
        for (var i = 0; i < this.length; i++) {
            if (this[i].FieldName.toLowerCase() == fieldName.toLowerCase())
                return true;
        }

        return false;
    }
}
class SobyAggregateField{
    constructor(fieldName: string, aggregateType: number) {
        this.FieldName = fieldName;
        this.AggregateType = aggregateType;
    }
    FieldName: string;
    AggregateType: number = 0;
}

class SobyGroupByField {
    constructor(fieldName: string, isAsc: boolean) {
        this.FieldName = fieldName;
        this.IsAsc = isAsc;
    }
    FieldName: string;
    IsAsc: boolean = false;
}
class SobyHeaders extends Array<SobyHeader> {
}
class SobyHeader {
    constructor(key: string, value: string) {
        this.Key = key;
        this.Value = value;
    }
    Key: string;
    Value: string;
}
class SobyArguments extends Array<SobyArgument> {
    ToJson() {
        return "";
    }
    ToQueryString() {
        return "";
    }
    Clone() {
        return null;
    }
}
class SobyArgument {
}

interface soby_ServiceInterface {
    DataSourceBuilder: soby_DataSourceBuilderAbstract;
    PageIndex: number;
    StartIndex: number;
    EndIndex: number;
    NextPageString: string;
    NextPageExist :boolean;
    Transport: soby_Transport;
//    constructor(dataSourceBuilder: soby_DataSourceBuilderAbstract);
    GroupBy(orderFields: SobyGroupByFields);
    Sort(orderFields:SobyOrderByFields);
    Filter(filters:SobyFilters, clearOtherFilters:boolean);
    GoToPage(pageIndex:number);
    CanNavigateToNextPage();
    CanNavigateToPreviousPage();
    PopulateNavigationInformation();
    NavigationInformationBeingPopulated();
    NavigationInformationPopulated();
    PopulateItems();
    GetFieldNames();
    ItemPopulated(items: Array<soby_Item>);
    ItemBeingPopulated();
    ErrorThrown(errorMessage: string);
    UpdateItem(key:string, objectInstance);
    DeleteItem(key: string);
    AddItem(objectInstance);
    ItemUpdated(args);
    ItemAdded(args);
    ItemDeleted(args);
}


interface soby_DataSourceBuilderInterface {
//    ActionName: string;
    ViewName: string;
    RowLimit: number;
//    Url: string;
    ItemCount: number;
    PageIndex: number;
    NextPageString: string;
//    constructor(listName: string, viewName: string, rowLimit: number, webUrl: string);
}

abstract class soby_DataSourceBuilderAbstract implements soby_DataSourceBuilderInterface {
//    RequestMethod: string;
//    ActionName: string; // ListName / MethodName
    ViewName: string;
    RowLimit: number;
//    Url: string; // WSUrl / WebUrl
    ItemCount: number;
    PageIndex: number;
    NextPageString: string;
    NextPageExist:boolean = false;
    Filters: SobyFilters = new SobyFilters(false);
    SchemaFields: SobySchemaFields = new SobySchemaFields();
    OrderByFields: SobyOrderByFields = new SobyOrderByFields();
    Arguments: SobyArguments = new SobyArguments();
    Headers: SobyHeaders = new SobyHeaders();

/*
    /*
    constructor(listName: string, viewName: string, rowLimit: number, webUrl: string) {
        this.ActionName = listName;
        this.ViewName = viewName;
        this.RowLimit = rowLimit;
        this.WebUrl = webUrl;
    }
    */

    GetViewField(fieldName: string) {
        for (var i = 0; i < this.SchemaFields.length; i++) {
            if (this.SchemaFields[i].FieldName == fieldName)
                return this.SchemaFields[i];
        }

        return null;
    }

    GetViewFieldByPropertyName(propertyName: string) {
        for (var i = 0; i < this.SchemaFields.length; i++) {
            if (this.SchemaFields[i].FieldName == propertyName)
                return this.SchemaFields[i];
        }

        return null;
    }

    AddHeader(key: string, value: string) {
        var header: SobyHeader = new SobyHeader(key, value);
        this.Headers.push(header);
    }

    AddSchemaField(fieldName: string, fieldType: number, args) {
        var schemaField: SobySchemaField = new SobySchemaField(fieldName, fieldType, args);
        this.SchemaFields.push(schemaField);
    }

    AddOrderField(fieldName: string, isAsc: boolean) {
        this.OrderByFields.push(new SobyOrderByField(fieldName, isAsc));
    }
    AddOrderFields(orderFields: SobyOrderByFields) {
        for (var i = 0; i < orderFields.length; i++) {
            this.OrderByFields.push(orderFields[i]);
        }
    }

    GetCountQuery(transport: soby_TransportRequest): string {
        return null;
    }
    GetMainQuery(transport: soby_TransportRequest):string {
        return "";
    }
    Clone(): soby_DataSourceBuilderAbstract {
        return null;
    }

    /*
    GetViewFieldByPropertyName(propertyName): SobySchemaField {
        return null;
    }
    */
    ParseData(value: string): Array<soby_Item> {
        return null;
    }
//    AddOrderField(sortFieldName: string, isAscending: boolean) { }
//    AddOrderFields(orderFields:SobyOrderByFields) { }
    GetData(data, callback, errorcallback, completecallback, async, wsUrl, headers, requestMethod, dataType) { }
}
// ******************************************************************

// ********************* HELPER METHODS *****************************
class soby_Filter {
    FieldName: string;
    Value: string;
    FieldType: number;
    FilterType: number;
    LookupID: boolean
}

/*
class soby_ViewField {
    FieldName:string
}
*/

class soby_Item {
//    FieldName: string
}

class soby_SharePointService implements soby_ServiceInterface {
    DataSourceBuilder :soby_DataSourceBuilderAbstract;
    DataSourceBuilderTemp: soby_DataSourceBuilderAbstract;
    constructor(dataSourceBuilder: soby_DataSourceBuilderAbstract) {
        this.DataSourceBuilder = dataSourceBuilder;
        this.DataSourceBuilderTemp = this.DataSourceBuilder.Clone();
        this.NextPageStrings = new Array<string>();
        this.NextPageStrings[0] = "";
    }
    NextPageString:string = "";
    NextPageExist: boolean;
//    SortFieldName: string = "";
    PageIndex: number = 0;
    StartIndex: number = 0;
    EndIndex: number = 0;
    NextPageStrings:Array<string>;
//    IsAscending: boolean = true;
    OrderByFields: SobyOrderByFields = new SobyOrderByFields();
    Filters: Array<soby_Filter> = new Array < soby_Filter>();
    Transport: soby_Transport;
    GroupBy(orderFields: SobyGroupByFields) {

    }

    Sort(orderByFields: SobyOrderByFields) {
//        var viewField = this.DataSourceBuilderTemp.GetViewFieldByPropertyName(fieldName);

        this.PageIndex = 0;
        this.NextPageString = "";
        this.NextPageStrings = new Array();
        this.NextPageStrings[0] = "";
        this.OrderByFields = orderByFields;
//        this.OrderByFields[this.OrderByFields.length] = new SobyOrderByField(fieldName, isAsc);
//        this.SortFieldName = viewField.FieldName;
//        this.IsAscending = isAsc;
        this.PopulateItems();
    };
    Filter(filters, clearOtherFilters) {
        this.PageIndex = 0;
        this.NextPageString = "";
        this.NextPageStrings = new Array();
        this.NextPageStrings[0] = "";
        if (clearOtherFilters == true)
            this.Filters = new Array();

        for (var i = 0; i < filters.length; i++) {
            var filter = new soby_Filter();
            filter.FieldName= filters[i].FieldName;
            filter.Value= filters[i].Value;
            filter.FieldType= filters[i].FieldType;
            filter.FilterType= filters[i].FilterType;
            filter.LookupID= filters[i].LookupID;
            this.Filters[this.Filters.length] = filter;
        }

        this.PopulateItems();
    };
    GoToPage(pageIndex) {
        this.DataSourceBuilderTemp.PageIndex = pageIndex;
        this.PageIndex = pageIndex;
        this.NextPageString = this.NextPageStrings[pageIndex];

        this.PopulateItems();
    };
    CanNavigateToNextPage() {
        if (this.DataSourceBuilderTemp.PageIndex >= this.NextPageStrings.length - 1)
            return false;

        return true;
    };
    CanNavigateToPreviousPage() {
        if (this.DataSourceBuilderTemp.PageIndex == 0)
            return false;

        return true;
    };
    PopulateNavigationInformation() {
        if (this.NavigationInformationBeingPopulated != null)
            this.NavigationInformationBeingPopulated();
    }
    NavigationInformationBeingPopulated() { }
    NavigationInformationPopulated() { }


    PopulateItems() {
        if (this.ItemBeingPopulated != null)
            this.ItemBeingPopulated();

        this.DataSourceBuilderTemp = this.DataSourceBuilder.Clone();
        if (this.OrderByFields.length>0)
            this.DataSourceBuilderTemp.AddOrderFields(this.OrderByFields);

        if (this.Filters.length > 0) {
            var extraFilters = new SobyFilters(true);
            for (var i = 0; i < this.Filters.length; i++) {
                extraFilters.AddFilter(this.Filters[i].FieldName, this.Filters[i].Value, this.Filters[i].FieldType, this.Filters[i].FilterType, this.Filters[i].LookupID)
                //            this.DataSourceBuilderTemp.Filters.AddFilter(this.Filters[i].FieldName, this.Filters[i].Value, this.Filters[i].FieldType, this.Filters[i].FilterType, this.Filters[i].LookupID)
                //            this.DataSourceBuilderTemp.Filters.AddFilter(this.Filters[i].FieldName, this.Filters[i].Value, SobyFieldTypes.Lookup, SobyFilterTypes.Equal, true)
            }
            this.DataSourceBuilderTemp.Filters.AddFilterCollection(extraFilters);
        }


        this.DataSourceBuilderTemp.PageIndex = this.PageIndex;
        this.DataSourceBuilderTemp.NextPageString = this.NextPageString;

        var service = this;

        soby_LogMessage(service.DataSourceBuilderTemp.GetMainQuery(this.Transport.Read));
        soby.SPLibrary.GetData(service.DataSourceBuilderTemp.GetMainQuery(this.Transport.Read),
            function (result) {
                soby_LogMessage(result);
                var items = service.DataSourceBuilderTemp.ParseData(result);
                soby_LogMessage(items);

                if (service.DataSourceBuilderTemp.NextPageString != null)
                    service.NextPageStrings[service.DataSourceBuilderTemp.PageIndex + 1] = service.DataSourceBuilderTemp.NextPageString;

                var startIndex = (service.DataSourceBuilderTemp.PageIndex * service.DataSourceBuilderTemp.RowLimit) + 1;
                var endIndex = startIndex + service.DataSourceBuilderTemp.ItemCount - 1;
                if (service.DataSourceBuilderTemp.ItemCount == 0) {
                    startIndex = 0;
                    endIndex = 0;
                }
                service.StartIndex = startIndex;
                service.EndIndex = endIndex;
                service.ItemPopulated(items);
            },
            function (XMLHttpRequest, textStatus, errorThrown) {
                var errorMessage = "An error occured on populating grid" + errorThrown;
                if (service.ErrorThrown != null)
                    service.ErrorThrown(errorMessage);
                soby_LogMessage(errorMessage);
            },
            function (XMLHttpRequest, textStatus, errorThrown) { }, true, this.Transport.Read.Url, null);
    }
    GetFieldNames = function () {
        var fieldNames = new Array();
        for (var i = 0; i < this.CamlBuilder.SchemaFields.length; i++) {
            fieldNames[fieldNames.length] = { FieldName: this.CamlBuilder.SchemaFields[i].FieldName }
        }

        return fieldNames;
    }

    ItemBeingPopulated() { }
    ItemPopulated(items: Array<soby_Item>) { }
    ErrorThrown(errorMessage:string) { }
    UpdateItem(key: string, objectInstance) { }
    DeleteItem(key: string) { }
    AddItem(objectInstance) { }
    ItemUpdated(args) { }
    ItemAdded(args) { }
    ItemDeleted(args) { }
}
// ******************************************************************

// ********************* HELPER METHODS *****************************
class soby_WebServiceService implements soby_ServiceInterface {
    DataSourceBuilder: soby_DataSourceBuilderAbstract;
    DataSourceBuilderTemp: soby_DataSourceBuilderAbstract;
    constructor(dataSourceBuilder: soby_DataSourceBuilderAbstract) {
        this.DataSourceBuilder = dataSourceBuilder;
        this.DataSourceBuilderTemp = this.DataSourceBuilder.Clone();
        this.NextPageStrings = new Array<string>();
        this.NextPageStrings[0] = "";
        this.Transport = new soby_Transport();
    }
    NextPageString: string = "";
//    SortFieldName: string = "";
    PageIndex: number = 0;
    StartIndex: number = 0;
    EndIndex: number = 0;
    NextPageStrings: Array<string>;
//    IsAscending: boolean = true;
    Filters: SobyFilters = new SobyFilters(false);
    GroupByFields: SobyGroupByFields = new SobyGroupByFields();
    OrderByFields: SobyOrderByFields = new SobyOrderByFields();
    NextPageExist:boolean = false;
    Transport: soby_Transport;

    PopulateNavigationInformation() {
        if (this.NavigationInformationBeingPopulated != null)
            this.NavigationInformationBeingPopulated();

        var service = this;
        //var countServiceUrl = this.Transport.Read.Url;
        var requestMethod = this.Transport.Read.Type;
        var dataType = this.Transport.Read.DataType;

        var countServiceUrl = this.DataSourceBuilderTemp.GetCountQuery(this.Transport.Read);
        if (countServiceUrl == null) {
            service.NavigationInformationPopulated();
            return;
        }
        this.DataSourceBuilderTemp.GetData("",
            function (result) {
                var totalItemCount = parseInt(result);
                soby_LogMessage("Total item count:" + totalItemCount);

                var startIndex = (service.DataSourceBuilderTemp.PageIndex * service.DataSourceBuilderTemp.RowLimit) + 1;
                var endIndex = ((service.DataSourceBuilderTemp.PageIndex+1) * service.DataSourceBuilderTemp.RowLimit);
                //var endIndex = startIndex + service.DataSourceBuilderTemp.ItemCount - 1;
                if (service.DataSourceBuilderTemp.RowLimit == 0) {
                    startIndex = 0;
                    endIndex = 0;
                }
                if (endIndex != 0 && totalItemCount > endIndex) {
                    service.NextPageExist = true;
                }
                else {
                    service.NextPageExist = false;
                    endIndex = totalItemCount;
                }
                soby_LogMessage("NextPageExist:" + service.NextPageExist);

                service.StartIndex = startIndex;
                service.EndIndex = endIndex;
                service.NavigationInformationPopulated();
            },
            function (XMLHttpRequest, textStatus, errorThrown) {
                var errorMessage = "An error occured on populating grid" + errorThrown;
                if (service.ErrorThrown != null)
                    service.ErrorThrown(errorMessage);
                soby_LogMessage(errorMessage);
            },
            function (XMLHttpRequest, textStatus, errorThrown) { }, true, countServiceUrl, service.DataSourceBuilderTemp.Headers, requestMethod, dataType);
    }
    NavigationInformationBeingPopulated() { }
    NavigationInformationPopulated() { }
    GroupBy(groupByFields: SobyGroupByFields) {
        this.GroupByFields = groupByFields;
        this.PopulateItems();
    }
    Sort(orderByFields: SobyOrderByFields) {
        this.PageIndex = 0;
        this.NextPageString = "";
        this.NextPageStrings = new Array();
        this.NextPageStrings[0] = "";
        this.OrderByFields = orderByFields;

        this.PopulateItems();
    };
    Filter(filters:SobyFilters, clearOtherFilters: boolean) {
        this.PageIndex = 0;
        this.NextPageString = "";
        this.NextPageStrings = new Array();
        this.NextPageStrings[0] = "";
        if (clearOtherFilters == true)
            this.Filters = new SobyFilters(filters.IsOr);

        this.Filters.AddFilterCollection(filters);

        /*
        for (var i = 0; i < filters.Filters.length; i++) {
            this.Filters.AddFilterObject(filters.Filters[i]);
        }
        */
        this.PopulateItems();
    };
    GoToPage(pageIndex:number) {
        this.DataSourceBuilderTemp.PageIndex = pageIndex;
        this.PageIndex = pageIndex;

        this.PopulateItems();
    };
    CanNavigateToNextPage() {
        if (this.NextPageExist == false)
            return false;

        return true;
    };
    CanNavigateToPreviousPage() {
        if (this.DataSourceBuilderTemp.PageIndex == 0)
            return false;

        return true;
    };

    PopulateItems() {
        if (this.ItemBeingPopulated != null)
            this.ItemBeingPopulated();

        this.DataSourceBuilderTemp = this.DataSourceBuilder.Clone();
        for (var i = 0; i < this.GroupByFields.length; i++) {
            this.DataSourceBuilderTemp.AddOrderField(this.GroupByFields[i].FieldName, this.GroupByFields[i].IsAsc);

        }
        if (this.OrderByFields.length > 0)
            this.DataSourceBuilderTemp.AddOrderFields(this.OrderByFields);
//        if (this.SortFieldName != null && this.SortFieldName != "")
//            this.DataSourceBuilderTemp.AddOrderField(this.SortFieldName, this.IsAscending);
        console.log("this.Filters:")
        console.log(this.Filters)
        if (this.Filters.Filters.length > 0) {
            this.DataSourceBuilderTemp.Filters.AddFilterCollection(this.Filters);
        }

        this.DataSourceBuilderTemp.PageIndex = this.PageIndex;
        this.DataSourceBuilderTemp.NextPageString = this.NextPageString;

        var service = this;
        var serviceUrl = this.Transport.Read.Url;
        var requestMethod = this.Transport.Read.Type;
        var dataType = this.Transport.Read.DataType;
        var mainQuery = service.DataSourceBuilderTemp.GetMainQuery(this.Transport.Read);
        if (mainQuery != null && mainQuery != "") {
            if (serviceUrl.indexOf("?") == -1) {
                serviceUrl += "?";
            }
            else {
                serviceUrl += "&";
            }
            serviceUrl += mainQuery;
        }
        
        this.DataSourceBuilderTemp.GetData("",
            function (result) {
                soby_LogMessage(result);
                var items = service.DataSourceBuilderTemp.ParseData(result);
                soby_LogMessage(items);

                soby_LogMessage("NextPageExist:" + result.NextPageExist);
                service.NextPageExist = result.NextPageExist;
                soby_LogMessage(service);

                var startIndex = (service.DataSourceBuilderTemp.PageIndex * service.DataSourceBuilderTemp.RowLimit) + 1;
                var endIndex = startIndex + service.DataSourceBuilderTemp.ItemCount - 1;
                if (service.DataSourceBuilderTemp.ItemCount == 0) {
                    startIndex = 0;
                    endIndex = 0;
                }
                service.StartIndex = startIndex;
                service.EndIndex = endIndex;
                service.ItemPopulated(items);
            },
            function (XMLHttpRequest, textStatus, errorThrown) {
                var errorMessage = "An error occured on populating grid" + errorThrown;
                if (service.ErrorThrown != null)
                    service.ErrorThrown(errorMessage);
                soby_LogMessage(errorMessage);
            },
            function (XMLHttpRequest, textStatus, errorThrown) { }, true, serviceUrl, service.DataSourceBuilderTemp.Headers, requestMethod, dataType);
    }

    Parse() {

    }

    GetFieldNames() {
        var fieldNames = new Array();
        for (var i = 0; i < this.DataSourceBuilderTemp.SchemaFields.length; i++) {
            fieldNames[fieldNames.length] = { FieldName: this.DataSourceBuilderTemp.SchemaFields[i].FieldName }
        }

        return fieldNames;
    }
    ItemPopulated(items: Array<soby_Item>) { }
    ItemBeingPopulated() { }
    ErrorThrown(errorMessage: string) { }
    UpdateItem(key: string, objectInstance) {
        var updateUrl = this.Transport.Update.Url.replace(/#key/gi, key)
        ajaxHelper(updateUrl, this.Transport.Update.Type, objectInstance, [this, key], function (item, args) {
            var service = args[0];
            service.ItemUpdated(args);
            /*
            grid.HideItemDialog();
            grid.Initialize(true);
            */
        }, function (errorThrown) {
        })
    }
    DeleteItem(key: string) {
        var deleteUrl = this.Transport.Delete.Url.replace(/#key/gi, key)
        ajaxHelper(deleteUrl, this.Transport.Delete.Type, null, [this, key], function (item, args) {
            var service = args[0];
            service.ItemDeleted(args);
            /*
            $("#" + rowId).remove();
            if (grid.GetSelectedRowIDs().length == 0) {
                grid.HideItemDialog();
                grid.Initialize(true);
            }
            */
        }, function (errorThrown) {
        });
    }
    AddItem(objectInstance) {
        ajaxHelper(this.Transport.Add.Url, this.Transport.Add.Type, objectInstance, [this], function (item, args) {
            var service = args[0];
            service.ItemAdded(args);
            /*
            grid.HideItemDialog();
            grid.Initialize(true);
            */
        }, function (errorThrown) {
        });
    }
    ItemUpdated(args) { }
    ItemAdded(args) { }
    ItemDeleted(args) { }
}
// ******************************************************************

// ********************* HELPER METHODS *****************************
function soby_StaticDataService(items) {
    this.Items = items;
    this.Filters = new Array();
    this.SortFieldName = "";
    this.IsAscending = true;
    this.PageIndex = 0;
    this.StartIndex = 0;
    this.EndIndex = 0;
    this.Sort = function (propertyName, isAsc) {
        this.PopulateItems();
    };
    this.Filter = function (propertyName, value, clearOtherFilters) {
        this.PopulateItems();
    };
    this.GoToPage = function (pageIndex) {
        this.PopulateItems();
    };
    this.CanNavigateToNextPage = function () {
        return true;
    };
    this.CanNavigateToPreviousPage = function () {
        return true;
    };
    this.PopulateItems = function () {
        if (this.ItemBeingPopulated != null)
            this.ItemBeingPopulated();

        this.ItemPopulated(this.Items);
    }
    this.GetFieldNames = function () {
        var fieldNames = new Array();
        return fieldNames;
    }
    /*
    UpdateItem(key: string, objectInstance) { }
    DeleteItem(key: string) { }
    AddItem(objectInstance) { }
    */
}
// ******************************************************************

function WSArgument(fieldName, filterValue) {
    this.FieldName = fieldName;
    this.FilterValue = filterValue;
}

function WSHeader(key, value) {
    this.Key = key;
    this.Value = value;
}

class soby_WSBuilder extends soby_DataSourceBuilderAbstract{
    constructor() {
        super();
        this.RowLimit = 100;
    }

    Clone() {
        var builder = new soby_WSBuilder();
        builder.RowLimit = this.RowLimit;
        for (var i = 0; i < this.SchemaFields.length; i++) {
            var viewField = this.SchemaFields[i];
            builder.AddSchemaField(viewField.FieldName, viewField.FieldType, viewField.Args);
        }

        builder.Filters = this.Filters.Clone();

        for (var i = 0; i < this.Headers.length; i++) {
            var header = this.Headers[i];
            builder.AddHeader(header.Key, header.Value);
        }

        for (var i = 0; i < this.OrderByFields.length; i++) {
            var orderByField = this.OrderByFields[i];
            builder.AddOrderField(orderByField.FieldName, orderByField.IsAsc);
        }

        builder.Arguments = this.Arguments != null ? this.Arguments.Clone() : null;

        return builder;
    }

    GetPagingQuery(transport: soby_TransportRequest) {
        if (transport.Type == "POST")
            return "'pageIndex': " + this.PageIndex + ","
                + "'pageItemCount': " + this.RowLimit;
        else {
            return "$skip=" + (this.PageIndex * this.RowLimit) + "&$top=" + this.RowLimit;
        }
    }
    GetViewFieldsQuery(transport: soby_TransportRequest) {
        if (transport.Type == "POST")
            return this.SchemaFields.toWebAPIString();
        else
            return this.SchemaFields.toWebAPIString();
    }
    GetOrderByFieldsQuery(transport: soby_TransportRequest) {
        var jsonString = "";
        for (var i = 0; i < this.OrderByFields.length; i++) {
            jsonString += this.OrderByFields[i].FieldName + " " + (this.OrderByFields[i].IsAsc == true ? "asc" : "desc") + ",";
        }

        if (jsonString != "") 
            jsonString = jsonString.substr(0, jsonString.length - 1);

        if (transport.Type == "POST") {
            if (jsonString == "")
                jsonString = "null";
            jsonString = "'orderByString': \"" + jsonString + "\"";
        }
        else if (jsonString != "")
            jsonString = "$orderby=" + jsonString;

        return jsonString;
    }
    GetWhereQuery(transport: soby_TransportRequest) {
        var query = "";
        if (transport.Type == "POST") {
            query = this.Filters.ToJson();
        }
        else {
            query = this.Filters.ToQueryString();
            if (query != "")
                query = "$filter=" + query;
        }
        return query;
    }
    GetMainQuery(transport: soby_TransportRequest) {
        var selectFieldsEnvelope = this.GetViewFieldsQuery(transport);
        var whereQuery = this.GetWhereQuery(transport);
        var orderByFieldsQuery = this.GetOrderByFieldsQuery(transport);
        var pagingQuery = this.GetPagingQuery(transport);
        if (transport.Type == "POST") {
            return "{" + whereQuery + ", " + orderByFieldsQuery + ", " + pagingQuery + "}";
        }
        else {
            var envelope = whereQuery;
            if (envelope != "" && selectFieldsEnvelope != "")
                envelope += "&";
            envelope += selectFieldsEnvelope;
            
            if (envelope != "" && orderByFieldsQuery != "")
                envelope += "&";
            envelope += orderByFieldsQuery;
            if (envelope != "" && pagingQuery != "")
                envelope += "&";
            envelope += pagingQuery;
            return envelope;
        }
    }
    GetCountQuery(transport: soby_TransportRequest) {
        var mainQuery = this.GetMainQuery(transport);
        var countServiceUrl = transport.Url + "/$count?" + mainQuery;
        if (transport.Type == "POST") {
            return "{" + mainQuery + "}";
        }
        else {
            return countServiceUrl;
        }
    }
    ParseData(result) {
        var result = result.value;
        for (var i = 0; i < result.length; i++) {
            for (var x = 0; x < this.SchemaFields.length; x++) {
                if (this.SchemaFields[x].FieldType == SobyFieldTypes.DateTime) {
                    var propertyName = this.SchemaFields[x].FieldName;
                    var value = result[i][propertyName];
                    if (value != null && value != "")
                        result[i][propertyName] = new Date(value.match(/\d+/)[0] * 1);
                }
            }
        }
        return result;
    }
    GetData(data, callback, errorcallback, completecallback, async, wsUrl, headers, requestMethod, dataType) {
        if (requestMethod == null || requestMethod == "")
            requestMethod = "POST";
        $.ajax({
            async: (async != null ? async : true),
            url: wsUrl,
            type: requestMethod,
            dataType: dataType,
            data: data,
            processData: false,
            contentType: "application/json; charset=utf-8",
            complete: function (XMLHttpRequest) {
            },
            error: function (XMLHttpRequest, textStatus, errorThrown) {
                if (errorcallback)
                    errorcallback(XMLHttpRequest, textStatus, errorThrown);
            },
            success: function (data) {
                var data = data;
                if (data.d != null)
                    data = data.d;
                if (callback)
                    callback(data);
            },
            beforeSend: function (xhr) {
                if (headers == null)
                    return;
                for (var i = 0; i < headers.length; i++) {
                    xhr.setRequestHeader(headers[i].Key, headers[i].Value);
                }
            }
        });
    };
}


// ********************* HELPER METHODS *****************************
var soby_guid = (function () {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000)
            .toString(16)
            .substring(1);
    }
    return function () {
        return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
            s4() + '-' + s4() + s4() + s4();
    };
})();

function soby_LogMessage(message) {
    try {
        console.log(message);
    } catch (err) { }
}

function soby_DateFromISO(d) {
    var xDate = d.split(" ")[0];
    var xTime = d.split(" ")[1];

    // split apart the hour, minute, & second
    var xTimeParts = xTime.split(":");
    var xHour = xTimeParts[0];
    var xMin = xTimeParts[1];
    var xSec = xTimeParts[2];

    // split apart the year, month, & day
    var xDateParts = xDate.split("-");
    var xYear = xDateParts[0];
    var xMonth = xDateParts[1] - 1;
    var xDay = xDateParts[2];

    var dDate = new Date(xYear, xMonth, xDay, xHour, xMin, xSec);
    return dDate;
    /*
    s = s.split(/\D/);
    return new Date(Date.UTC(s[0], --s[1] || '', s[2] || '', s[3] || '', s[4] || '', s[5] || '', s[6] || ''))
    */
}
function soby_GetFormatedDateString(date) {
    var dateOptions = { year: "numeric", month: "short", day: "numeric" };
    return (date != null ? date.toLocaleDateString("en-gb", dateOptions) : "")
}
// ************************************************************

// ********************* CAML BUILDER *****************************
function soby_CamlBuilder(listName, viewName, rowLimit, webUrl) {
    this.WebUrl = webUrl;
    this.ActionName = listName;
    this.SchemaFields = new Array();
    this.ViewName = viewName;
    this.RowLimit = rowLimit;
    this.PageIndex = 0;
    this.NextPageString = "";
    this.OrderByFields = new Array();
    this.Filters = null;
    this.ItemCount = 0;

    this.Clone = function () {
        var camlBuilder = new soby_CamlBuilder(this.ActionName, this.ViewName, this.RowLimit, this.WebUrl);
        for (var i = 0; i < this.SchemaFields.length; i++) {
            var viewField = this.SchemaFields[i];
            camlBuilder.AddViewField(viewField.FieldName, viewField.PropertyName, viewField.FieldType, viewField.DisplayName, viewField.IsVisible, viewField.DisplayFunction);
        }

        for (var i = 0; i < this.OrderByFields.length; i++) {
            var orderByField = this.OrderByFields[i];
            camlBuilder.AddOrderField(orderByField.FieldName, orderByField.IsAsc);
        }

        camlBuilder.Filters = this.Filters.Clone();

        return camlBuilder;
    }

    this.GetViewField = function (fieldName) {
        for (var i = 0; i < this.SchemaFields.length; i++) {
            if (this.SchemaFields[i].FieldName == fieldName)
                return this.SchemaFields[i];
        }

        return null;
    }

    this.GetViewFieldByPropertyName = function (propertyName) {
        for (var i = 0; i < this.SchemaFields.length; i++) {
            if (this.SchemaFields[i].PropertyName == propertyName)
                return this.SchemaFields[i];
        }

        return null;
    }

    this.AddViewField = function (fieldName, propertyName, fieldType) {
        var viewField = {
            FieldName : fieldName,
            PropertyName : propertyName,
            FieldType : fieldType
        }
        this.SchemaFields[this.SchemaFields.length] = viewField;
    }

    this.AddOrderField = function (fieldName, isAsc) {
        var orderField = {
            FieldName : fieldName,
            IsAsc : isAsc
        }
        this.OrderByFields[this.OrderByFields.length] = orderField;
    }
    this.GetPagingQuery = function () {
        if (this.NextPageString != null && this.NextPageString != "") {
            //var  "&PageFirstRow=" + pageFirstRow 
            //var pageFirstRow = "PageFirstRow=" + (this.PageIndex * this.RowLimit + 1);
            //return "<Paging ListItemCollectionPositionNext=\"Paged=TRUE&amp;p_ID=" + this.NextPageString + "\" />";
            return "<Paging ListItemCollectionPositionNext=\"" + this.NextPageString.replace(/&/gi, "&amp;") + "\" />";
        }
        else {
            return "";
        }
    }
    this.GetViewFieldsQuery = function () {
        var query = "";
        for (var i = 0; i < this.SchemaFields.length; i++) {
            query += "<FieldRef Name='" + this.SchemaFields[i].FieldName + "' />";
        }

        if (query != "")
            query = "<ViewFields xmlns=\"\">" + query + "</ViewFields>";
        return query;
    }
    this.GetOrderByFieldsQuery = function () {
        var query = "";
        for (var i = 0; i < this.OrderByFields.length; i++) {
            query += "<FieldRef Name='" + this.OrderByFields[i].FieldName + "'  Ascending='" + (this.OrderByFields[i].IsAsc == true ? "TRUE" : "FALSE") + "' />";
        }

        if (query != "")
            query = "<OrderBy>" + query + "</OrderBy>";
        return query;
    }
    this.GetWhereQuery = function () {
        var query = "";
        if (this.Filters != null) {
            query = "<Where>" + this.Filters.ToCaml() + "</Where>";
        }
        return query;
    }
    this.GetMainQuery = function () {
        var soapEnv = "<soap:Envelope xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance'" +
            " xmlns:xsd='http://www.w3.org/2001/XMLSchema' \
					      xmlns:soap='http://schemas.xmlsoap.org/soap/envelope/'> \
					      <soap:Body> \
					        <GetListItems xmlns='http://schemas.microsoft.com/sharepoint/soap/'> \
					          <listName>" + this.ActionName + "</listName> \
					          <viewName>" + this.ViewName + "</viewName> \
					          <query><Query>" + this.GetWhereQuery() + this.GetOrderByFieldsQuery() + "</Query></query> \
					          <viewFields>" + this.GetViewFieldsQuery() + "</viewFields> \
					          <rowLimit>" + this.RowLimit + "</rowLimit> \
					          <queryOptions><QueryOptions xmlns=''><IncludeMandatoryColumns>FALSE</IncludeMandatoryColumns><ViewAttributes Scope='RecursiveAll'/>" + this.GetPagingQuery() + "</QueryOptions></queryOptions> \
					        </GetListItems> \
					      </soap:Body> \
					    </soap:Envelope>";
        return soapEnv;
    }
    this.ParseData = function (result) {
        var items = new Array();
        var viewFields = this.ViewFields;
        var xmlData = $(result.responseText);
        this.ItemCount = parseInt(xmlData.find("rs\\:data, data").attr("ItemCount"));
        var listItemNext = xmlData.find("rs\\:data, data").attr("ListItemCollectionPositionNext");
        if (listItemNext != "" && listItemNext != null) {
            this.NextPageString = listItemNext;//.substring(listItemNext.lastIndexOf('=') + 1);
        }
        else {
            this.NextPageString = null;
        }
        xmlData.find("z\\:row, row").each(function () {
            var item = new Object();
            for (var i = 0; i < viewFields.length; i++) {
                var propertyName = viewFields[i].PropertyName;
                var value = $(this).attr("ows_" + viewFields[i].FieldName);

                switch (viewFields[i].FieldType) {
                    case SobyFieldTypes.Lookup:
                        var valueArray = new Array();
                        if (value != "" && value != null) {
                            var values = value.split(";#");
                            for (var x = 0; x < values.length; x = x + 2) {
                                var valueItem = {
                                    ID : values[x],
                                    DisplayName : values[x + 1]
                                }
                                valueArray[valueArray.length] = valueItem;
                            }
                        }
                        item[propertyName] = valueArray;
                        break;
                    case SobyFieldTypes.MultiChoice:
                        var valueArray = new Array();
                        if (value != "" && value != null) {
                            var values = value.split(";#");
                            for (var x = 0; x < values.length; x++) {
                                if (x == 0 || x == values.length - 1)
                                    continue;
                                valueArray[valueArray.length] = values[x];
                            }
                        }
                        item[propertyName] = valueArray;
                        break;
                    case SobyFieldTypes.Boolean:
                        if (value == "1")
                            item[propertyName] = true;
                        else
                            item[propertyName] = false;
                        break;
                    case SobyFieldTypes.DateTime:
                        if (value != "" && value != null) {
                            item[propertyName] = soby_DateFromISO(value);
                        }
                        break;
                    default:
                        if (value == null)
                            item[propertyName] = "";
                        else
                            item[propertyName] = value;
                }
            }

            if (viewFields.length == 0) {
                $.each(this.attributes, function (i, attrib) {
                    var name = attrib.name.substring(4);
                    var value = attrib.value;
                    item[name] = value;
                });
            }

            items[items.length] = item;
        });
        return items;
    }
}
// ************************************************************

var sobyObject = function () {
    this.SPLibraryObject = function () {
        this.ListsObject = function () {
            this.ApproveListItem = function (siteUrl, listName, id, callbackFunction) {
                var batch =
                    "<Batch OnError=\"Continue\"> \
                        <Method ID=\"1\" Cmd=\"Moderate\"> \
                            <Field Name=\"ID\">" + id + "</Field> \
                            <Field Name=\"_ModerationStatus\">0</Field> \
                                                             </Method> \
                    </Batch>";
                            var soapEnv =
                                "<?xml version=\"1.0\" encoding=\"utf-8\"?> \
                    <soap:Envelope xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance/\" \
                        xmlns:xsd=\"http://www.w3.org/2001/XMLSchema/\" \
                        xmlns:soap=\"http://schemas.xmlsoap.org/soap/envelope/\"> \
                      <soap:Body> \
                        <UpdateListItems xmlns=\"http://schemas.microsoft.com/sharepoint/soap/\"> \
                          <listName>" + listName + "</listName> \
                          <updates> \
                            " + batch + "</updates> \
                        </UpdateListItems> \
                      </soap:Body> \
                    </soap:Envelope>";


                $.ajax({
                    async: false,
                    url: siteUrl + "/_vti_bin/lists.asmx",
                    beforeSend: function (xhr) {
                        xhr.setRequestHeader("SOAPAction",
                            "http://schemas.microsoft.com/sharepoint/soap/UpdateListItems");
                    },
                    type: "POST",
                    dataType: "xml",
                    data: soapEnv,
                    complete: function (data) { if (callbackFunction != null) callbackFunction(); },
                    success: function (XMLHttpRequest, textStatus, errorThrown) { soby_LogMessage(XMLHttpRequest) },
                    error: function (XMLHttpRequest, textStatus, errorThrown) { soby_LogMessage(XMLHttpRequest) },
                    contentType: "text/xml; charset=utf-8"
                });
            }
            this.GetListProperties = function (webUrl, listName, callbackFunction) {
                var soapEnv = "<soap:Envelope xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:soap='http://schemas.xmlsoap.org/soap/envelope/'> \
					<soap:Body> \
					 <GetList xmlns='http://schemas.microsoft.com/sharepoint/soap/'> \
					 	<listName>" + listName + "</listName> \
				 	 </GetList> \
				 	</soap:Body> \
				   </soap:Envelope>";

                soby.SPLibrary.GetData(soapEnv,
                    function (result) {
                        var xmlData = $(result.responseText);
                        var list = null;
                        var listResult = xmlData.find("List");
                        if (listResult.length > 0) {
                            list = new Object();
                            list.ID = $(listResult[0]).attr("id");
                            callbackFunction(list);
                        }
                        else {
                            callbackFunction(null);
                        }
                    },
                    function (XMLHttpRequest, textStatus, errorThrown) {
                        soby_LogMessage(errorThrown);
                    },
                    function (XMLHttpRequest, textStatus, errorThrown) { }, true, webUrl, null);

            }
            this.UpdateList = function (siteUrl, listName, listProperties, callBackFunction, _arguments) {
                var listPropertiesXml = "<List ";
                for (var i = 0; i < listProperties.length; i++) {
                    listPropertiesXml += listProperties[i].Key + "=\"" + listProperties[i].Value + "\" ";
                }
                listPropertiesXml += "></List>";
                var soapEnv = "<soap:Envelope xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:soap='http://schemas.xmlsoap.org/soap/envelope/'> \
					<soap:Body> \
					    <UpdateList xmlns=\"http://schemas.microsoft.com/sharepoint/soap/\"> \
						  <listName>" + listName + "</listName> \
						  <listProperties>" + listPropertiesXml + "</listProperties> \
						</UpdateList> \
					</soap:Body> \
				</soap:Envelope>";

                $.ajax({
                    url: siteUrl + "/_vti_bin/Lists.asmx",
                    beforeSend: function (xhr) { xhr.setRequestHeader("SOAPAction", "http://schemas.microsoft.com/sharepoint/soap/UpdateList"); },
                    type: "POST",
                    dataType: "xml",
                    data: soapEnv,
                    complete: function processResult(xData, status) {
                        soby_LogMessage(xData.responseText)
                        if (callBackFunction != null)
                            callBackFunction(_arguments);
                    },
                    error: function (XMLHttpRequest, textStatus, errorThrown) { soby_LogMessage(XMLHttpRequest); soby_LogMessage(textStatus); soby_LogMessage(errorThrown); },
                    contentType: "text/xml; charset=\"utf-8\""
                });
            }
            this.UpdateItem = function (webUrl, listName, itemID, dataFields, successCallbackFunction, errorCallbackFunction, isAsync, argumentsx) {
                var batch = "<Batch OnError=\"Continue\">";
                if (itemID != null && itemID != "")
                    batch += "<Method ID=\"" + itemID + "\" Cmd=\"Update\">";
                else
                    batch += "<Method ID=\"1\" Cmd=\"New\">";

                if (itemID != null && itemID != "")
                    dataFields[dataFields.length] = { FieldName: "ID", Value: itemID };

                for (var i = 0; i < dataFields.length; i++) {
                    batch += "<Field Name=\"" + dataFields[i].FieldName + "\"><![CDATA[" + dataFields[i].Value + "]]></Field>";
                }

                batch += "</Method></Batch>";

                var soapEnv =
                    "<?xml version=\"1.0\" encoding=\"utf-8\"?> \
        <soap:Envelope xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance/\" \
            xmlns:xsd=\"http://www.w3.org/2001/XMLSchema/\" \
            xmlns:soap=\"http://schemas.xmlsoap.org/soap/envelope/\"> \
          <soap:Body> \
            <UpdateListItems xmlns=\"http://schemas.microsoft.com/sharepoint/soap/\"> \
              <listName>" + listName + "</listName> \
              <updates> \
                " + batch + "</updates> \
            </UpdateListItems> \
          </soap:Body> \
        </soap:Envelope>";

                soby_LogMessage(soapEnv);
                if (isAsync == null || isAsync == "")
                    isAsync = true;
                $.ajax({
                    async: isAsync,
                    url: webUrl + "/_vti_bin/lists.asmx",
                    beforeSend: function (xhr) {
                        xhr.setRequestHeader("SOAPAction",
                            "http://schemas.microsoft.com/sharepoint/soap/UpdateListItems");
                    },
                    type: "POST",
                    dataType: "xml",
                    data: soapEnv,
                    complete: function (data) {
                    },
                    error: function (XMLHttpRequest, textStatus, errorThrown) {
                        soby_LogMessage("An error occured on UpdateItem");
                        soby_LogMessage(XMLHttpRequest);
                        soby_LogMessage(textStatus);
                        soby_LogMessage(errorThrown);
                        if (errorCallbackFunction != null)
                            errorCallbackFunction(argumentsx);
                    },
                    success: function (data) {
                        var xmlData = $(data);
                        var itemId = xmlData.find("z\\:row, row").attr("ows_ID");
                        if (successCallbackFunction != null)
                            successCallbackFunction(itemId, argumentsx)
                    },
                    contentType: "text/xml; charset=utf-8"
                });
            }
            this.UploadFile = function (siteUrl, sourceFileUrl, destinationFileUrl, fieldValues, callBackFunction, _arguments, isAsync) {
                var fieldValueString = "";
                for (var i = 0; i < fieldValues.length; i++) {
                    fieldValueString += "<FieldInformation Type='" + fieldValues[i].Type + "' Value='" + fieldValues[i].Value + "' ";
                    if (fieldValues[i].InternalName != null)
                        fieldValueString += " InternalName='" + fieldValues[i].InternalName + "'";
                    else
                        fieldValueString += " DisplayName='" + fieldValues[i].DisplayName + "'";
                    fieldValueString += " />";
                }
                var soapEnv =
                    "<soap:Envelope xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:soap='http://schemas.xmlsoap.org/soap/envelope/'> \
        <soap:Body>\
            <CopyIntoItemsLocal xmlns='http://schemas.microsoft.com/sharepoint/soap/'>\
                <SourceUrl><![CDATA[" + sourceFileUrl.trim() + "]]></SourceUrl>\
                    <DestinationUrls>\
                        <string><![CDATA[" + destinationFileUrl.trim() + "]]></string>\
                    </DestinationUrls>\
                    <Fields>\
                    " + fieldValueString + " \
                    </Fields>\
            </CopyIntoItemsLocal>\
        </soap:Body>\
    </soap:Envelope>";
                soby_LogMessage(soapEnv);

                if (isAsync == null)
                    isAsync = true;

                $.ajax({
                    async: isAsync,
                    url: siteUrl + "/_vti_bin/copy.asmx",
                    beforeSend: function (xhr) { xhr.setRequestHeader("SOAPAction", "http://schemas.microsoft.com/sharepoint/soap/CopyIntoItemsLocal"); },
                    type: "POST",
                    dataType: "xml",
                    data: soapEnv,
                    complete: function processResult(xData, status) {
                        soby_LogMessage("Upload result;");
                        soby_LogMessage(xData);
                        soby_LogMessage(status);

                        if (callBackFunction != null)
                            callBackFunction(_arguments);
                    },
                    contentType: "text/xml; charset=\"utf-8\""
                });
            }
            this.GetLists = function (siteUrl, callbackFunction) {
                var soapEnv =
                    "<?xml version=\"1.0\" encoding=\"utf-8\"?> \
        <soap:Envelope xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance/\" \
            xmlns:xsd=\"http://www.w3.org/2001/XMLSchema/\" \
            xmlns:soap=\"http://schemas.xmlsoap.org/soap/envelope/\"> \
          <soap:Body> \
		     <GetListCollection xmlns=\"http://schemas.microsoft.com/sharepoint/soap/\" /> \
          </soap:Body> \
    </soap:Envelope>";


                $.ajax({
                    async: false,
                    url: siteUrl + "/_vti_bin/lists.asmx",
                    beforeSend: function (xhr) {
                        xhr.setRequestHeader("SOAPAction",
                            "http://schemas.microsoft.com/sharepoint/soap/GetListCollection");
                    },
                    type: "POST",
                    dataType: "xml",
                    data: soapEnv,
                    complete: function (data) {
                        var lists = new Array();
                        var xmlData = $(data.responseText);
                        var listsXml = xmlData.find("List");
                        for (var i = 0; i < listsXml.length; i++) {
                            var listXml = $(listsXml[i]);
                            var list = {
                                ID : listXml.attr("ID"),
                                Title : listXml.attr("Title"),
                                Fields : soby.SPLibrary.Lists.GetListFields(siteUrl, list.Title)
                            };
                            lists[lists.length] = list;
                        }

                        if (callbackFunction != null)
                            callbackFunction(lists);
                    },
                    success: function (XMLHttpRequest, textStatus, errorThrown) { soby_LogMessage(XMLHttpRequest) },
                    error: function (XMLHttpRequest, textStatus, errorThrown) { soby_LogMessage(XMLHttpRequest) },
                    contentType: "text/xml; charset=utf-8"
                });
            }
            this.GetListAndView = function (siteUrl, listName, viewName, callbackFunction) {
                var soapEnv =
                    "<?xml version=\"1.0\" encoding=\"utf-8\"?> \
        <soap:Envelope xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance/\" \
            xmlns:xsd=\"http://www.w3.org/2001/XMLSchema/\" \
            xmlns:soap=\"http://schemas.xmlsoap.org/soap/envelope/\"> \
          <soap:Body> \
		     <GetListAndView xmlns=\"http://schemas.microsoft.com/sharepoint/soap/\" ><listName>" + listName + "</listName><viewName>" + viewName + "</viewName></GetListAndView> \
          </soap:Body> \
    </soap:Envelope>";


                $.ajax({
                    async: false,
                    url: siteUrl + "/_vti_bin/lists.asmx",
                    beforeSend: function (xhr) {
                        xhr.setRequestHeader("SOAPAction",
                            "http://schemas.microsoft.com/sharepoint/soap/GetListAndView");
                    },
                    type: "POST",
                    dataType: "xml",
                    data: soapEnv,
                    complete: function (data) {
                        /*
                              var lists = new Array();
                            var xmlData = $(data.responseText);
                            var listsXml = xmlData.find("List");
                            for(var i=0;i<listsXml.length;i++){
                                var listXml = $(listsXml[i]);
                                var list = {};
                                list.ID = listXml.attr("ID");
                                list.Title = listXml.attr("Title");
                                list.Fields = soby.SPLibrary.Lists.GetListFields(siteUrl, list.Title);
                                lists[lists.length] = list;
                            }
                
                         if (callbackFunction != null)
                              callbackFunction(lists);
                              */
                    },
                    success: function (XMLHttpRequest, textStatus, errorThrown) { soby_LogMessage(XMLHttpRequest) },
                    error: function (XMLHttpRequest, textStatus, errorThrown) { soby_LogMessage(XMLHttpRequest) },
                    contentType: "text/xml; charset=utf-8"
                });
            }
            this.GetListFields = function (siteUrl, listName) {
                var soapEnv =
                    "<?xml version=\"1.0\" encoding=\"utf-8\"?> \
        <soap:Envelope xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance/\" \
            xmlns:xsd=\"http://www.w3.org/2001/XMLSchema/\" \
            xmlns:soap=\"http://schemas.xmlsoap.org/soap/envelope/\"> \
          <soap:Body> \
		    <GetList xmlns=\"http://schemas.microsoft.com/sharepoint/soap/\"> \
		      <listName>" + listName + "</listName> \
		    </GetList> \
	      </soap:Body> \
	    </soap:Envelope>";

                var fields = new Array();
                $.ajax({
                    async: false,
                    url: siteUrl + "/_vti_bin/lists.asmx",
                    beforeSend: function (xhr) {
                        xhr.setRequestHeader("SOAPAction",
                            "http://schemas.microsoft.com/sharepoint/soap/GetList");
                    },
                    type: "POST",
                    dataType: "xml",
                    data: soapEnv,
                    complete: function (data) {
                        var xmlData = $(data.responseText);
                        var fieldsXml = xmlData.find("Field");
                        for (var i = 0; i < fieldsXml.length; i++) {
                            var fieldXml = $(fieldsXml[i]);
                            if (fieldXml.attr("frombasetype") == "TRUE" && fieldXml.attr("name") != "Title")
                                continue;
                            if (fieldXml.attr("id") == null || fieldXml.attr("id") == "")
                                continue;

                            var required = false;
                            if (fieldXml.attr("required") == "TRUE")
                                required = true;

                            var hidden = false;
                            if (fieldXml.attr("hidden") == "TRUE")
                                hidden = true;

                            var field = {
                                ID : fieldXml.attr("id"),
                                InternalName : fieldXml.attr("name"),
                                DisplayName : fieldXml.attr("displayname"),
                                Type : fieldXml.attr("type"),
                                Required : required,
                                Hidden : hidden
                            };
                            fields[fields.length] = field;
                        }
                    },
                    success: function (XMLHttpRequest, textStatus, errorThrown) { soby_LogMessage(XMLHttpRequest) },
                    error: function (XMLHttpRequest, textStatus, errorThrown) { soby_LogMessage(XMLHttpRequest) },
                    contentType: "text/xml; charset=utf-8"
                });

                return fields;
            }
            this.CreateList = function (siteUrl, listName, templateID) {
                var soapEnv =
                    "<?xml version=\"1.0\" encoding=\"utf-8\"?> \
        <soap:Envelope xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance/\" \
            xmlns:xsd=\"http://www.w3.org/2001/XMLSchema/\" \
            xmlns:soap=\"http://schemas.xmlsoap.org/soap/envelope/\"> \
          <soap:Body> \
		    <AddList xmlns=\"http://schemas.microsoft.com/sharepoint/soap/\"> \
		      <listName>" + listName + "</listName> \
		      <description>" + listName + "</description> \
		      <templateID>" + templateID + "</templateID> \
		    </AddList> \
	      </soap:Body> \
	    </soap:Envelope>";

                $.ajax({
                    async: false,
                    url: siteUrl + "/_vti_bin/lists.asmx",
                    beforeSend: function (xhr) {
                        xhr.setRequestHeader("SOAPAction",
                            "http://schemas.microsoft.com/sharepoint/soap/AddList");
                    },
                    type: "POST",
                    dataType: "xml",
                    data: soapEnv,
                    complete: function (data) {
                        var xmlData = $(data.responseText);
                    },
                    success: function (XMLHttpRequest, textStatus, errorThrown) { soby_LogMessage(XMLHttpRequest) },
                    error: function (XMLHttpRequest, textStatus, errorThrown) { soby_LogMessage(XMLHttpRequest) },
                    contentType: "text/xml; charset=utf-8"
                });
            }
            this.CheckOutFile = function (siteUrl, fileUrl, callbackFunction, _arguments, isAsync) {
                if (isAsync == null)
                    isAsync = true;

                var soapEnv =
                    "<?xml version=\"1.0\" encoding=\"utf-8\"?> \
        <soap:Envelope xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance/\" \
            xmlns:xsd=\"http://www.w3.org/2001/XMLSchema/\" \
            xmlns:soap=\"http://schemas.xmlsoap.org/soap/envelope/\"> \
          <soap:Body> \
            <CheckOutFile xmlns=\"http://schemas.microsoft.com/sharepoint/soap/\"> \
              <pageUrl>" + fileUrl + "</pageUrl> \
            </CheckOutFile> \
          </soap:Body> \
        </soap:Envelope>";


                $.ajax({
                    async: isAsync,
                    url: siteUrl + "/_vti_bin/lists.asmx",
                    beforeSend: function (xhr) {
                        xhr.setRequestHeader("SOAPAction",
                            "http://schemas.microsoft.com/sharepoint/soap/CheckOutFile");
                    },
                    type: "POST",
                    dataType: "xml",
                    data: soapEnv,
                    complete: function (data) {
                        var xmlData = $(data.responseText);
                        var result = xmlData.find("CheckOutFileResult").text();
                        var success = false;
                        if (result == "true")
                            success = true;

                        if (callbackFunction != null) callbackFunction(success, _arguments);
                    },
                    success: function (XMLHttpRequest, textStatus, errorThrown) { soby_LogMessage(XMLHttpRequest) },
                    error: function (XMLHttpRequest, textStatus, errorThrown) { soby_LogMessage(XMLHttpRequest) },
                    contentType: "text/xml; charset=utf-8"
                });
            }
            this.CheckInFile = function (siteUrl, fileUrl, comment, checkinType, callbackFunction, _arguments, isAsync) {
                if (isAsync == null)
                    isAsync = true;

                var soapEnv =
                    "<?xml version=\"1.0\" encoding=\"utf-8\"?> \
        <soap:Envelope xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance/\" \
            xmlns:xsd=\"http://www.w3.org/2001/XMLSchema/\" \
            xmlns:soap=\"http://schemas.xmlsoap.org/soap/envelope/\"> \
          <soap:Body> \
            <CheckInFile xmlns=\"http://schemas.microsoft.com/sharepoint/soap/\"> \
              <pageUrl>" + fileUrl + "</pageUrl> \
              <comment>" + comment + "</comment> \
              <CheckinType>" + checkinType + "</CheckinType> \
            </CheckInFile> \
          </soap:Body> \
        </soap:Envelope>";


                $.ajax({
                    async: isAsync,
                    url: siteUrl + "/_vti_bin/lists.asmx",
                    beforeSend: function (xhr) {
                        xhr.setRequestHeader("SOAPAction",
                            "http://schemas.microsoft.com/sharepoint/soap/CheckInFile");
                    },
                    type: "POST",
                    dataType: "xml",
                    data: soapEnv,
                    complete: function (data) { if (callbackFunction != null) callbackFunction(_arguments); },
                    success: function (XMLHttpRequest, textStatus, errorThrown) { soby_LogMessage(XMLHttpRequest) },
                    error: function (XMLHttpRequest, textStatus, errorThrown) { soby_LogMessage(XMLHttpRequest) },
                    contentType: "text/xml; charset=utf-8"
                });
            }
            this.UpdateFieldsToList = function (addAction, siteUrl, listTemplate, fieldTemplates, successCallBack, errorCallBack) {
                var fieldsXml = "";
                for (var i = 0; i < fieldTemplates.length; i++) {
                    var fieldXml = "<Field DisplayName='" + (addAction == true ? fieldTemplates[i].InternalName : fieldTemplates[i].DisplayName) + "' Name='" + fieldTemplates[i].InternalName + "' ";
                    if (fieldTemplates[i].Type == "User" && fieldTemplates[i].Mult == true) {
                        fieldXml += " Type='UserMulti'";
                    }
                    else {
                        fieldXml += " Type='" + fieldTemplates[i].Type + "'";
                    }

                    if (fieldTemplates[i].Hidden == true)
                        fieldXml += " Hidden='TRUE'";
                    if (fieldTemplates[i].Required == true)
                        fieldXml += " Required='TRUE'";
                    /*
                    if (fieldTemplates[i].Type == "Lookup") {
                        fieldXml += " Group='Operations'/>";
                        oField = oList.get_fields().addFieldAsXml(fieldXml);
                        oField = clientContext.castTo(oField, SP.FieldLookup);
                        for (var y = 0; y < un_SelectedTemplate.Lists.length; y++) {
                            if (un_SelectedTemplate.Lists[y].Title == fieldTemplates[i].LookupListName) {
                                oField.set_lookupList(un_SelectedTemplate.Lists[y].ID);
                            }
                        }

                        oField.set_lookupField("Title");
                    }
                    else
                    */
                        if (fieldTemplates[i].Type == "Choice" || fieldTemplates[i].Type == "MultiChoice") {

                        fieldXml += "><CHOICES>";
                        for (var n = 0; n < fieldTemplates[i].Choices.length; n++) {
                            fieldXml += "<CHOICE>" + fieldTemplates[i].Choices[n] + "</CHOICE>";
                        }
                        fieldXml += "</CHOICES>"
                        if (fieldTemplates[i].DefaultValue != null && fieldTemplates[i].DefaultValue != "")
                            fieldXml += "<Default>" + fieldTemplates[i].DefaultValue + "</Default>";
                        fieldXml += "</Field>";
                    }
                    else if (fieldTemplates[i].Type == "URL") {
                        fieldXml += " Format='Hyperlink' />";
                    }
                    else if (fieldTemplates[i].Type == "Note") {
                        fieldXml += " NumLines='6' AppendOnly='FALSE' RichText='FALSE' />";
                    }
                    else if (fieldTemplates[i].Type == "User") {
                        if (fieldTemplates[i].Mult == true) {
                            fieldXml += " UserSelectionMode='PeopleOnly' UserSelectionScope='0' Mult='TRUE' />"
                        }
                        else {
                            fieldXml += " UserSelectionMode='PeopleOnly' UserSelectionScope='0' Mult='TRUE' />"
                        }
                    }
                    else {
                        fieldXml += " />";
                    }

                    fieldsXml += "<Method ID=\"" + i + "\">" + fieldXml + "</Method>";
                }

                fieldsXml = "<Fields>" + fieldsXml + "</Fields>";

                var newFieldsString = "";
                var updateFieldsString = "";
                if (addAction == true)
                    newFieldsString = "<newFields>" + fieldsXml + "</newFields>";
                else
                    updateFieldsString = "<updateFields>" + fieldsXml + "</updateFields>";

                var soapEnv = "<soap:Envelope xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:soap='http://schemas.xmlsoap.org/soap/envelope/'> \
					<soap:Body> \
						 <UpdateList xmlns=\"http://schemas.microsoft.com/sharepoint/soap/\"> \
							  <listName>" + listTemplate.Title + "</listName> \
							  <listProperties></listProperties> \
							  " + newFieldsString + " \
							  " + updateFieldsString + " \
						</UpdateList> \
				 	</soap:Body> \
				   </soap:Envelope>";
                $.ajax({
                    async: false,
                    url: siteUrl + "/_vti_bin/lists.asmx",
                    beforeSend: function (xhr) {
                        xhr.setRequestHeader("SOAPAction",
                            "http://schemas.microsoft.com/sharepoint/soap/UpdateList");
                    },
                    type: "POST",
                    dataType: "xml",
                    data: soapEnv,
                    complete: function (data) {
                        var xmlData = $(data.responseText);
                    },
                    success: function (XMLHttpRequest, textStatus, errorThrown) { },
                    error: function (XMLHttpRequest, textStatus, errorThrown) { soby_LogMessage(XMLHttpRequest) },
                    contentType: "text/xml; charset=utf-8"
                });
                if (successCallBack != null)
                    successCallBack();
            }
            this.GetListItemAttachments = function (listName, listItemId, callbackFunction, webUrl) {
                var soapEnv = "<soap:Envelope xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:soap='http://schemas.xmlsoap.org/soap/envelope/'> \
					<soap:Body> \
					 <GetAttachmentCollection xmlns='http://schemas.microsoft.com/sharepoint/soap/'> \
					 	<listName>" + listName + "</listName> \
					 	<listItemID>" + listItemId + "</listItemID> \
				 	 </GetAttachmentCollection> \
				 	</soap:Body> \
				   </soap:Envelope>";

                soby.SPLibrary.GetData(soapEnv,
                    function (result) {
                        var xmlData = $(result.responseText);
                        var list = null;
                        var attachmentsArray = xmlData.find("Attachment");
                        var attachments = new Array();
                        for (var i = 0; i < attachmentsArray.length; i++) {
                            attachments[attachments.length] = $(attachmentsArray[i]).text();
                        }

                        callbackFunction(listItemId, attachments);
                    },
                    function (XMLHttpRequest, textStatus, errorThrown) {
                        soby_LogMessage(errorThrown);
                    },
                    function (XMLHttpRequest, textStatus, errorThrown) { }, true, webUrl, null);
            }

        }
        this.UserGroupObject = function () {
            this.GetGroupInfo = function (siteUrl, groupName, callbackFunction, async, args) {
                if (async == null)
                    async = true;
                var soapEnv = "<soap:Envelope xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:soap='http://schemas.xmlsoap.org/soap/envelope/'> \
					<soap:Body> \
					    <GetGroupInfo xmlns='http://schemas.microsoft.com/sharepoint/soap/directory/'> \
					      <groupName>" + groupName + "</groupName> \
 					   </GetGroupInfo > \
				 	</soap:Body> \
				   </soap:Envelope>";
                $.ajax({
                    async: async,
                    url: siteUrl + "/_vti_bin/usergroup.asmx",
                    beforeSend: function (xhr) {
                        xhr.setRequestHeader("SOAPAction",
                            "http://schemas.microsoft.com/sharepoint/soap/directory/GetGroupInfo");
                    },
                    type: "POST",
                    dataType: "xml",
                    data: soapEnv,
                    complete: function (data) {
                        var xmlData = $(data.responseText);
                        var groupId = xmlData.find("Group").attr("ID");

                        if (callbackFunction != null)
                            callbackFunction(groupId, args)

                    },
                    success: function (XMLHttpRequest, textStatus, errorThrown) { },
                    error: function (XMLHttpRequest, textStatus, errorThrown) { soby_LogMessage(XMLHttpRequest) },
                    contentType: "text/xml; charset=utf-8"
                });
            }
            this.CheckGroupContainsUser = function (siteUrl, groupName, userId, callbackFunction, async) {
                if (async == null)
                    async = true;
                var soapEnv = "<soap:Envelope xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:soap='http://schemas.xmlsoap.org/soap/envelope/'> \
					<soap:Body> \
					    <GetUserCollectionFromGroup xmlns='http://schemas.microsoft.com/sharepoint/soap/directory/'> \
					      <groupName>" + groupName + "</groupName> \
 					   </GetUserCollectionFromGroup> \
				 	</soap:Body> \
				   </soap:Envelope>";
                $.ajax({
                    async: async,
                    url: siteUrl + "/_vti_bin/usergroup.asmx",
                    beforeSend: function (xhr) {
                        xhr.setRequestHeader("SOAPAction",
                            "http://schemas.microsoft.com/sharepoint/soap/directory/GetUserCollectionFromGroup");
                    },
                    type: "POST",
                    dataType: "xml",
                    data: soapEnv,
                    complete: function (data) {
                        var xmlData = $(data.responseText);
                        var users = xmlData.find("User");
                        var contains = false;
                        for (var i = 0; i < users.length; i++) {
                            var _userId = $(users[i]).attr("id");
                            if (_userId == userId)
                                contains = true;
                        }

                        if (callbackFunction != null)
                            callbackFunction(contains)

                    },
                    success: function (XMLHttpRequest, textStatus, errorThrown) { },
                    error: function (XMLHttpRequest, textStatus, errorThrown) { soby_LogMessage(XMLHttpRequest) },
                    contentType: "text/xml; charset=utf-8"
                });
            }
            this.CheckUserRolesAndPermissions = function (siteUrl, callbackFunction) {
                var soapEnv = "<soap:Envelope xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:soap='http://schemas.xmlsoap.org/soap/envelope/'> \
					<soap:Body> \
					    <GetRolesAndPermissionsForCurrentUser xmlns='http://schemas.microsoft.com/sharepoint/soap/directory/'></GetRolesAndPermissionsForCurrentUser > \
				 	</soap:Body> \
				   </soap:Envelope>";
                $.ajax({
                    async: true,
                    url: siteUrl + "/_vti_bin/usergroup.asmx",
                    beforeSend: function (xhr) {
                        xhr.setRequestHeader("SOAPAction",
                            "http://schemas.microsoft.com/sharepoint/soap/directory/GetRolesAndPermissionsForCurrentUser ");
                    },
                    type: "POST",
                    dataType: "xml",
                    data: soapEnv,
                    complete: function (xData) {
                        var xmlData = $(xData.responseText);
                        var userPerm = parseInt($(xData.responseText).find("Permissions").attr("Value"));
                        var hasAccessRights = false;
                        if (userPerm > 0)
                            hasAccessRights = true;

                        if (callbackFunction != null)
                            callbackFunction(hasAccessRights);

                    },
                    success: function (XMLHttpRequest, textStatus, errorThrown) { },
                    error: function (XMLHttpRequest, textStatus, errorThrown) { soby_LogMessage(XMLHttpRequest) },
                    contentType: "text/xml; charset=utf-8"
                });
            }
            this.GetRolesAndPermissionsForCurrentUser = function (siteUrl) {
                var roles = new Array();
                var soapEnv = "<soap:Envelope xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:soap='http://schemas.xmlsoap.org/soap/envelope/'> \
					<soap:Body> \
					    <GetRolesAndPermissionsForCurrentUser xmlns=\"http://schemas.microsoft.com/sharepoint/soap/directory/\" /> \
				 	</soap:Body> \
				   </soap:Envelope>";
                $.ajax({
                    async: false,
                    url: siteUrl + "/_vti_bin/UserGroup.asmx",
                    beforeSend: function (xhr) {
                        xhr.setRequestHeader("SOAPAction",
                            "http://schemas.microsoft.com/sharepoint/soap/directory/GetRolesAndPermissionsForCurrentUser");
                    },
                    type: "POST",
                    dataType: "xml",
                    data: soapEnv,
                    complete: function (data) {
                        var xmlData = $(data.responseText);
                        var _roles = xmlData.find("Role");
                        for (var i = 0; i < _roles.length; i++) {
                            var id = $(_roles[i]).attr("ID");
                            var name = $(_roles[i]).attr("Name");
                            var type = $(_roles[i]).attr("Type");

                            roles[roles.length] = { ID: id, Name: name, Type: type };
                        }
                    },
                    success: function (XMLHttpRequest, textStatus, errorThrown) { },
                    error: function (XMLHttpRequest, textStatus, errorThrown) { soby_LogMessage(XMLHttpRequest) },
                    contentType: "text/xml; charset=utf-8"
                });
                return roles;
            }
        }
        this.WebsObject = function () {
            this.GetSites = function (siteUrl, callbackFunction) {
                var soapEnv = "<soap:Envelope xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:soap='http://schemas.xmlsoap.org/soap/envelope/'> \
					<soap:Body> \
					    <GetWebCollection xmlns='http://schemas.microsoft.com/sharepoint/soap/directory/'> \
 					   </GetWebCollection> \
				 	</soap:Body> \
				   </soap:Envelope>";
                $.ajax({
                    async: true,
                    url: siteUrl + "/_vti_bin/webs.asmx",
                    beforeSend: function (xhr) {
                        xhr.setRequestHeader("SOAPAction",
                            "http://schemas.microsoft.com/sharepoint/soap/GetWebCollection");
                    },
                    type: "POST",
                    dataType: "xml",
                    data: soapEnv,
                    complete: function (data) {
                        var sites = new Array();
                        var xmlData = $(data.responseText);
                        var webs = xmlData.find("Web");
                        for (var i = 0; i < webs.length; i++) {
                            var title = $(webs[i]).attr("Title");
                            var url = $(webs[i]).attr("Url");

                            sites[sites.length] = { Title: title, Url: url };
                        }
                        callbackFunction(siteUrl, sites)

                    },
                    success: function (XMLHttpRequest, textStatus, errorThrown) { },
                    error: function (XMLHttpRequest, textStatus, errorThrown) { soby_LogMessage(XMLHttpRequest) },
                    contentType: "text/xml; charset=utf-8"
                });
            }
        }
        this.SitesObject = function () {
            this.CreateSubSite = function (siteUrl, subSiteUrl, title, callBackFunction, _arguments) {
                var soapEnv = "<soap:Envelope xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:soap='http://schemas.xmlsoap.org/soap/envelope/'> \
					<soap:Body> \
						<CreateWeb xmlns=\"http://schemas.microsoft.com/sharepoint/soap/\"> \
						  <url><![CDATA[" + subSiteUrl + "]]></url> \
						  <title><![CDATA[" + title + "]]></title> \
						  <description><![CDATA[" + title + "]]></description> \
						  <templateName>STS#0</templateName> \
						  <language>1033</language> \
						  <locale>1033</locale> \
						  <collationLocale>1033</collationLocale> \
						  <uniquePermissions>1</uniquePermissions> \
						  <anonymous>1</anonymous> \
						  <presence>1</presence> \
						</CreateWeb> \
					</soap:Body> \
				</soap:Envelope>";

                $.ajax({
                    url: siteUrl + "/_vti_bin/Sites.asmx",
                    beforeSend: function (xhr) { xhr.setRequestHeader("SOAPAction", "http://schemas.microsoft.com/sharepoint/soap/CreateWeb"); },
                    type: "POST",
                    dataType: "xml",
                    data: soapEnv,
                    complete: function processResult(xData, status) {
                        if (callBackFunction != null)
                            callBackFunction(_arguments);
                    },
                    error: function (XMLHttpRequest, textStatus, errorThrown) { soby_LogMessage(XMLHttpRequest); soby_LogMessage(textStatus); soby_LogMessage(errorThrown); },
                    contentType: "text/xml; charset=\"utf-8\""
                });

            }
        }
        this.ViewsObject = function () {
            this.GetViews = function (siteUrl, listName, callbackFunction) {
                var soapEnv =
                    "<?xml version=\"1.0\" encoding=\"utf-8\"?> \
        <soap:Envelope xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance/\" \
            xmlns:xsd=\"http://www.w3.org/2001/XMLSchema/\" \
            xmlns:soap=\"http://schemas.xmlsoap.org/soap/envelope/\"> \
          <soap:Body> \
		     <GetViewCollection xmlns=\"http://schemas.microsoft.com/sharepoint/soap/\" ><listName>" + listName + "</listName></GetViewCollection> \
          </soap:Body> \
    </soap:Envelope>";


                $.ajax({
                    async: false,
                    url: siteUrl + "/_vti_bin/views.asmx",
                    beforeSend: function (xhr) {
                        xhr.setRequestHeader("SOAPAction",
                            "http://schemas.microsoft.com/sharepoint/soap/GetViewCollection");
                    },
                    type: "POST",
                    dataType: "xml",
                    data: soapEnv,
                    complete: function (data) {
                        var views = new Array();
                        var xmlData = $(data.responseText);
                        var viewsXml = xmlData.find("View");
                        for (var i = 0; i < viewsXml.length; i++) {
                            var viewXml = $(viewsXml[i]);
                            var view = {
                                ID : viewXml.attr("Name"),
                                Title : viewXml.attr("DisplayName"),
                                Url : viewXml.attr("Url")
                            };
                            views[views.length] = view;
                        }

                        if (callbackFunction != null)
                            callbackFunction(views);
                    },
                    success: function (XMLHttpRequest, textStatus, errorThrown) { soby_LogMessage(XMLHttpRequest) },
                    error: function (XMLHttpRequest, textStatus, errorThrown) { soby_LogMessage(XMLHttpRequest) },
                    contentType: "text/xml; charset=utf-8"
                });
            }
        }
        this.WebPartPagesObject = function () {
            this.AddContentEditorWebPart = function (siteUrl, pageUrl, properties, callBackFunction, _arguments) {
                var webPartXml = "&lt;?xml version=&quot;1.0&quot; encoding=&quot;utf-16&quot;?&gt;&lt;WebPart xmlns:xsd=&quot;http://www.w3.org/2001/XMLSchema&quot; xmlns:xsi=&quot;http://www.w3.org/2001/XMLSchema-instance&quot; xmlns=&quot;http://schemas.microsoft.com/WebPart/v2&quot;&gt;&lt;Title&gt;Custom Part&lt;/Title&gt;&lt;FrameType&gt;None&lt;/FrameType&gt;&lt;Description&gt;Use for formatted text, tables, and images.&lt;/Description&gt;&lt;IsIncluded&gt;true&lt;/IsIncluded&gt;&lt;ZoneID&gt;Left&lt;/ZoneID&gt; &lt;PartOrder&gt;6&lt;/PartOrder&gt;&lt;FrameState&gt;Normal&lt;/FrameState&gt;&lt;Height /&gt;&lt;Width /&gt; &lt;AllowRemove&gt;true&lt;/AllowRemove&gt;&lt;AllowZoneChange&gt;true&lt;/AllowZoneChange&gt;&lt;AllowMinimize&gt;true&lt;/AllowMinimize&gt;&lt;IsVisible&gt;true&lt;/IsVisible&gt;&lt;DetailLink /&gt;&lt;HelpLink /&gt;&lt;Dir&gt;Default&lt;/Dir&gt;&lt;PartImageSmall /&gt;&lt;MissingAssembly /&gt;&lt;PartImageLarge&gt;/_layouts/images/mscontl.gif&lt;/PartImageLarge&gt;&lt;IsIncludedFilter /&gt;&lt;Assembly&gt;Microsoft.SharePoint, Version=12.0.0.0, Culture=neutral, PublicKeyToken=71e9bce111e9429c&lt;/Assembly&gt;&lt;TypeName&gt;Microsoft.SharePoint.WebPartPages.ContentEditorWebPart&lt;/TypeName&gt;"

                for (var i = 0; i < properties.length; i++) {
                    var contentXml = properties[i].Value.replace(/</gi, "&lt;").replace(/>/gi, "&gt;").replace(/\"/gi, "&quot;");
                    //&lt;![CDATA[  ]]&gt;
                    webPartXml += "&lt;" + properties[i].Key + " xmlns=&quot;http://schemas.microsoft.com/WebPart/v2/ContentEditor&quot;&gt;" + contentXml + "&lt;/" + properties[i].Key + "&gt;"
                }
                webPartXml += "&lt;Content xmlns=&quot;http://schemas.microsoft.com/WebPart/v2/ContentEditor&quot; /&gt;"

                webPartXml += " &lt;PartStorage xmlns=&quot;http://schemas.microsoft.com/WebPart/v2/ContentEditor&quot; /&gt;&lt;/WebPart&gt;";

                var soapEnv = "<soap:Envelope xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:soap='http://schemas.xmlsoap.org/soap/envelope/'> \
					<soap:Body> \
					 <AddWebPart xmlns=\"http://microsoft.com/sharepoint/webpartpages\"> \
						  <pageUrl>" + pageUrl + "</pageUrl> \
						  <webPartXml>" + webPartXml + "</webPartXml> \
						  <storage>Shared</storage> \
					</AddWebPart> \
					</soap:Body> \
				</soap:Envelope>";
                $.ajax({
                    url: siteUrl + "/_vti_bin/WebPartPages.asmx",
                    beforeSend: function (xhr) { xhr.setRequestHeader("SOAPAction", "http://microsoft.com/sharepoint/webpartpages/AddWebPart"); },
                    type: "POST",
                    dataType: "xml",
                    data: soapEnv,
                    complete: function processResult(xData, status) {
                        if (callBackFunction != null)
                            callBackFunction(_arguments);
                    },
                    error: function (XMLHttpRequest, textStatus, errorThrown) { soby_LogMessage(XMLHttpRequest); soby_LogMessage(textStatus); soby_LogMessage(errorThrown); },
                    contentType: "text/xml; charset=\"utf-8\""
                });
            }
        }
        this.VersionsObject = function () {
            this.GetVersions = function (siteUrl, filename, callbackFunction) {
                var soapEnv =
                    "<?xml version=\"1.0\" encoding=\"utf-8\"?> \
        <soap:Envelope xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance/\" \
            xmlns:xsd=\"http://www.w3.org/2001/XMLSchema/\" \
            xmlns:soap=\"http://schemas.xmlsoap.org/soap/envelope/\"> \
          <soap:Body> \
            <GetVersions xmlns=\"http://schemas.microsoft.com/sharepoint/soap/\"> \
              <fileName><![CDATA[" + filename + "]]></fileName> \
            </GetVersions> \
          </soap:Body> \
        </soap:Envelope>";


                $.ajax({
                    async: false,
                    url: siteUrl + "/_vti_bin/versions.asmx",
                    beforeSend: function (xhr) {
                        xhr.setRequestHeader("SOAPAction",
                            "http://schemas.microsoft.com/sharepoint/soap/GetVersions");
                    },
                    type: "POST",
                    dataType: "xml",
                    data: soapEnv,
                    complete: function (data) { if (callbackFunction != null) callbackFunction(data); },
                    success: function (XMLHttpRequest, textStatus, errorThrown) { soby_LogMessage(XMLHttpRequest) },
                    error: function (XMLHttpRequest, textStatus, errorThrown) { soby_LogMessage(XMLHttpRequest) },
                    contentType: "text/xml; charset=utf-8"
                });
            }
            /*
            this.GetItemVersions = function (siteUrl, listName, xmlQuery, callbackFunction) {
                var objClientCtx = new SP.ClientContext.get_current();
                var oWeb = objClientCtx.get_web();
                var oList = oWeb.get_lists().getByTitle(listName);
                var query = new SP.CamlQuery();
                query.set_viewXml(xmlQuery);
                var objlistItems = oList.getItems(query);
                objClientCtx.load(objlistItems);
                objClientCtx.executeQueryAsync(function (sender, args) {
                    //that.DataSet = [];
                    var objlistEnumerator = objlistItems.getEnumerator();
                    while (objlistEnumerator.moveNext()) {
                        var objListItem = objlistEnumerator.get_current();
                        var itemId = objListItem.get_item('ID');
                        var filePath = siteUrl + '/Lists/' + listName + '/' + itemId + '_.000'
                        var web = objClientCtx.get_web();
                        var listItemInfo = web.getFileByServerRelativeUrl(filePath)
                        var listItemFields = listItemInfo.get_listItemAllFields()
                        objClientCtx.load(web);
                        objClientCtx.load(listItemInfo);
                        objClientCtx.load(listItemFields);
                        //objClientCtx.load(versions1);
                        objClientCtx.executeQueryAsync(
                            function (sender, args) {
                                var fileVersions = listItemInfo.get_versions();
                                objClientCtx.load(fileVersions);
                                objClientCtx.executeQueryAsync(
                                    function (sender, args) {
                                        var objlistVersionEnumerator = fileVersions.getEnumerator();
                                        while (objlistVersionEnumerator.moveNext()) {
                                            var objCurrentListItemVersion = objlistVersionEnumerator.get_current();
                                            var versionId = objCurrentListItemVersion.get_id();
                                            var $div = $('<div>');
                                            $div.load(siteUrl + '/Lists/' + listName + '/DispForm.aspx?ID=' + itemId + '&VersionNo=' + versionId + ' table.ms-formtable', function () {
                                                var table = $(this).find('table.ms-formtable');
                                                var tr = $(table).find('tr');
                                                $(tr).each(function () {
                                                    var row = $(this);
                                                    var columnName = $.trim(row.find('td:eq(0)').text());
                                                    var columnValue = $.trim(row.find('td:eq(1)').text());
                                                });

                                            });
                                        }

                                    },
                                    function (sender, args) { soby_LogMessage('Error'); }
                                )

                            },
                            function (sender, args) {
                                soby_LogMessage(sender)
                                soby_LogMessage(args)
                                soby_LogMessage('error')
                            });

                    }
                    callbackFunction();

                }, function (sender, args) {
                    this._onGetFail(sender, args);
                });
            }
            */
            this.GetVersionCollection = function (siteUrl, listID, itemID, fieldName, callbackFunction) {
                var soapEnv =
                    "<?xml version=\"1.0\" encoding=\"utf-8\"?> \
        <soap:Envelope xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance/\" \
            xmlns:xsd=\"http://www.w3.org/2001/XMLSchema/\" \
            xmlns:soap=\"http://schemas.xmlsoap.org/soap/envelope/\"> \
          <soap:Body> \
            <GetVersionCollection xmlns=\"http://schemas.microsoft.com/sharepoint/soap/\"> \
              <strlistID><![CDATA[" + listID + "]]></strlistID> \
              <strlistItemID><![CDATA[" + itemID + "]]></strlistItemID> \
              <strFieldName><![CDATA[" + fieldName + "]]></strFieldName> \
            </GetVersionCollection> \
          </soap:Body> \
        </soap:Envelope>";


                $.ajax({
                    async: false,
                    url: siteUrl + "/_vti_bin/lists.asmx",
                    beforeSend: function (xhr) {
                        xhr.setRequestHeader("SOAPAction", "http://schemas.microsoft.com/sharepoint/soap/GetVersionCollection");
                    },
                    type: "POST",
                    dataType: "xml",
                    data: soapEnv,
                    complete: function (data) { if (callbackFunction != null) callbackFunction(data); },
                    success: function (XMLHttpRequest, textStatus, errorThrown) { soby_LogMessage(XMLHttpRequest) },
                    error: function (XMLHttpRequest, textStatus, errorThrown) { soby_LogMessage(XMLHttpRequest) },
                    contentType: "text/xml; charset=utf-8"
                });
            }
        }
        this.GetData = function (soapEnv, callback, errorcallback, completecallback, async, siteUrl, argsx) {
            var url = "/_vti_bin/Lists.asmx";
            if (siteUrl != null && siteUrl != "")
                url = siteUrl + "/_vti_bin/Lists.asmx";
            else
                url = "/_vti_bin/Lists.asmx";
            $.ajax({
                async: (async != null ? async : true),
                url: url,
                type: "POST",
                dataType: "xml",
                data: soapEnv,
                contentType: "text/xml; charset=\"utf-8\"",
                complete: function (data) {
                    if (callback)
                        callback(data, argsx);
                },
                error: function (XMLHttpRequest, textStatus, errorThrown) {
                    if (errorcallback)
                        errorcallback(XMLHttpRequest, textStatus, errorThrown);
                },
                success: function (XMLHttpRequest, textStatus, errorThrown) {
                    if (completecallback)
                        completecallback(XMLHttpRequest, textStatus, errorThrown, argsx);
                }
            });
        };

        this.Lists = new this.ListsObject();
        this.UserGroup = new this.UserGroupObject();
        this.Webs = new this.WebsObject();
        this.Sites = new this.SitesObject();
        this.Views = new this.ViewsObject();
        this.WebPartPages = new this.WebPartPagesObject();
        this.Versions = new this.VersionsObject();
    };

    this.SPLibrary = new this.SPLibraryObject();
}
var soby = new sobyObject();



















